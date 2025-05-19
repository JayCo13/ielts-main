from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, Form, File, UploadFile
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import ExamSection, VIPSubscription, VIPPackage, ExamAccessType, User
from sqlalchemy import or_, and_
from datetime import datetime, timedelta
import pytz
import random
import os
import secrets
import requests
from uuid import uuid4
import string
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from typing import Optional, List
from app.utils.datetime_utils import get_vietnam_time
from datetime import timedelta
from urllib.parse import urlencode, quote_plus

# Models
class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    username: str
    email: str
    role: str

class StudentCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UpdateAdminProfileRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    
class UpdateStudentRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    is_active: Optional[bool] = None
    is_active_student: Optional[bool] = None
    

class CreateStudentRequest(BaseModel):
    username: str
    email: str
    image_url: Optional[str] = None

class GoogleLogin(BaseModel):
    email: EmailStr
    username: str
    google_id: str
    profile_picture: Optional[str] = None

# Configuration
router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

UPLOAD_DIR = "static/student_images"
DEFAULT_STUDENT_IMAGE = "static/student_images/default-img.png" 
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Google OAuth configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USER_INFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    
    return user
def create_or_update_student(
    db: Session,
    email: str,
    username: str,
    google_id: str = None,
    profile_picture: str = None,
    password: str = None
) -> User:
    student = db.query(User).filter(User.email == email).first()
    
    if student:
        # Update existing student
        if google_id and not student.google_id:
            student.google_id = google_id
        if profile_picture and not student.image_url:
            student.image_url = profile_picture
        student.status = "online"
        student.last_active = datetime.utcnow()
    else:
        # Create new student
        hashed_password = get_password_hash(password or secrets.token_hex(16))
        student = User(
            username=username,
            email=email,
            password=hashed_password,
            google_id=google_id,
            image_url=profile_picture or DEFAULT_STUDENT_IMAGE,
            role="customer",
            status="online",
            created_at=datetime.utcnow(),
            last_active=datetime.utcnow()
        )
        db.add(student)
    
    db.commit()
    db.refresh(student)
    return student
 

async def check_exam_access(user: User, exam_id: int, db: Session) -> bool:
    """Check if a user has access to a specific exam based on their role and VIP status"""
    
    # Get exam section type
    exam_section = db.query(ExamSection).filter(
        ExamSection.exam_id == exam_id
    ).first()
    
    if not exam_section:
        return False
    
    # Speaking is free for all
    if exam_section.section_type == 'speaking':
        return True
    
    # For customers, check VIP status and test limits
    if user.role == "customer":
        # Check test limit for non-VIP users
        if not user.is_vip:
            # Remove the recursive call that's causing the error
            # For non-VIP users, we'll just check access types below
            pass
        else:
            # Check if user has VIP access for this skill
            active_subscription = db.query(VIPSubscription).join(VIPPackage).filter(
                VIPSubscription.user_id == user.user_id,
                VIPSubscription.end_date > datetime.utcnow(),
                VIPSubscription.payment_status == "completed",
                or_(
                    VIPPackage.package_type == 'all_skills',
                    and_(
                        VIPPackage.package_type == 'single_skill',
                        VIPPackage.skill_type == exam_section.section_type
                    )
                )
            ).first()
            
            if not active_subscription:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"You need a VIP subscription for {exam_section.section_type} tests"
                )
    
    # Get exam access types
    exam_access_types = db.query(ExamAccessType)\
        .filter(ExamAccessType.exam_id == exam_id)\
        .all()
    
    allowed_types = []
    
    if user.role == 'student':
        allowed_types = ['student']
    elif user.role == 'customer':
        if user.is_vip:
            allowed_types = ['no vip', 'vip']
        else:
            allowed_types = ['no vip']
    elif user.role == 'admin':
        allowed_types = ['student', 'no vip', 'vip']
    
    # Check if any of the exam's access types match the user's allowed types
    exam_types = [access.access_type for access in exam_access_types]
    return any(access_type in allowed_types for access_type in exam_types)
def generate_random_password(length=6):
    characters = string.ascii_uppercase + string.digits
    return ''.join(random.choice(characters) for _ in range(length))

# Replace datetime.utcnow() with get_vietnam_time() in functions like:
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = get_vietnam_time() + expires_delta
    else:
        expire = get_vietnam_time() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_student(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.username == username).first()
    if user is None or user.role not in ["student", "customer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students and customers can perform this action"
        )
    
    # Check if account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active"
        )
    
    # Check if account has expired (only for student accounts)
    if user.role == "student" and user.account_activated_at is not None:
        expiry_date = user.account_activated_at + timedelta(days=60)
        if datetime.utcnow() > expiry_date:
            # Update status to inactive if expired
            user.is_active = False
            db.commit()
            
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account has expired"
            )
    
    return user

async def get_current_admin(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.username == username).first()
    if user is None or user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can perform this action"
        )
    return user
@router.get("/google-auth")
async def google_auth(request: Request):
    """Initiates the Google OAuth flow"""
    callback_uri = f"{request.base_url.scheme}://{request.base_url.netloc}/google-callback"
    
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "response_type": "code",
        "scope": "openid email profile",
        "redirect_uri": callback_uri,  # Use dynamic callback URI
        "access_type": "offline",
        "prompt": "consent select_account"
    }
    
    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params, quote_via=quote_plus)}"
    return RedirectResponse(auth_url)

@router.get("/google-callback")
async def google_callback(
    code: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Handles the Google OAuth callback"""
    try:
        callback_uri = f"{request.base_url.scheme}://{request.base_url.netloc}/google-callback"
        
        # Exchange code for token
        token_response = requests.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": callback_uri,  # Use dynamic callback URI
                "grant_type": "authorization_code",
            },
            timeout=10
        )
        token_response.raise_for_status()
        token_data = token_response.json()
        
        # Get user info
        user_response = requests.get(
            GOOGLE_USER_INFO_URL,
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
            timeout=10
        )
        user_response.raise_for_status()
        user_info = user_response.json()
        
        # Extract user data
        email = user_info.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Google")
        
        # Create or update student
        student = create_or_update_student(
            db=db,
            email=email,
            username=user_info.get("name", email.split("@")[0]),
            google_id=user_info.get("sub"),
            profile_picture=user_info.get("picture")
        )
        
        # Fix in google_callback function
        # Create access token
        access_token = create_access_token(data={"sub": student.username})  # Change from user_id to username
        
        # Redirect to frontend
        params = {
            "token": access_token,
            "user_id": student.user_id,
            "username": student.username,
            "email": student.email,
            "role": student.role
        }
        redirect_url = f"{os.getenv('FRONTEND_URL')}/auth-callback?{urlencode(params, quote_via=quote_plus)}"
        return RedirectResponse(redirect_url)
        
    except requests.RequestException as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to communicate with Google: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
@router.post("/register", response_model=Token)
async def register_student(student_data: StudentCreate, db: Session = Depends(get_db)):
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == student_data.email).first()
    if existing_user:
        # If the email is already registered, send a notification email
        try:
            from app.utils.email_utils import send_email
            
            # Create email content
            subject = "Ielttrenmay.com - Email đã được sử dụng"
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                    <h2 style="color: #4a86e8;">Ielttrenmay.com - Tài khoản đã tồn tại</h2>
                    <p>Xin chào,</p>
                    <p>Chúng tôi nhận thấy bạn đã cố gắng đăng ký với địa chỉ email này, nhưng một tài khoản đã tồn tại.</p>
                    <p>Nếu bạn quên mật khẩu, bạn có thể đặt lại bằng cách sử dụng liên kết "Quên mật khẩu" trên trang đăng nhập.</p>
                    <p>Nếu bạn không cố gắng đăng ký, bạn có thể bỏ qua email này.</p>
                    <p>Cảm ơn bạn,<br>Đội ngũ Ielttrenmay.com</p>
                </div>
            </body>
            </html>
            """
            
            # Send the email silently (don't raise exceptions if it fails)
            try:
                send_email(student_data.email, subject, html_content)
            except Exception as e:
                print(f"Failed to send 'account exists' email: {str(e)}")
                # Don't block the response, just log the error
                
        except ImportError:
            # If email utils aren't available, just continue
            pass
            
        # Return the same error response
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
        
    # Check if username already exists
    existing_user_name = db.query(User).filter(User.username == student_data.username).first()
    if existing_user_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Validate if the email domain is real
    try:
        from app.utils.email_utils import is_valid_email
        
        if not is_valid_email(student_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email address. Please provide a valid email."
            )
    except ImportError:
        # If email validation isn't available, continue with registration
        pass
    
    # Create new student
    hashed_password = get_password_hash(student_data.password)
    new_student = User(
        username=student_data.username,
        email=student_data.email,
        password=hashed_password,
        role="customer",   
        status="online",
        created_at=datetime.utcnow(),
        last_active=datetime.utcnow(),
        image_url=DEFAULT_STUDENT_IMAGE  # Set default image
    )
    
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_student.username},  # Change from user_id to username
        expires_delta=access_token_expires
    )
    
    # Send welcome email
    try:
        from app.utils.email_utils import send_account_created_email
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        
        # Send the welcome email silently (don't raise exceptions if it fails)
        try:
            # Customize the welcome email in Vietnamese directly here
            from app.utils.email_utils import send_email
            
            subject = "Ielttrenmay.com - Chào mừng bạn đến với hệ thống"
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                    <h2 style="color: #4a86e8;">Chào mừng đến với Ielttrenmay.com!</h2>
                    <p>Xin chào {new_student.username},</p>
                    <p>Chúng tôi rất vui mừng thông báo rằng tài khoản Ielttrenmay của bạn đã được tạo thành công.</p>
                    <p>Bạn có thể đăng nhập ngay bây giờ để truy cập tất cả các tài liệu ôn thi IELTS của chúng tôi.</p>
                    <p>
                        <a href="{frontend_url}/login" style="display: inline-block; padding: 10px 20px; background-color: #4a86e8; color: white; text-decoration: none; border-radius: 5px;">
                            Đăng nhập ngay
                        </a>
                    </p>
                    <p>Nếu bạn có bất kỳ câu hỏi hoặc cần hỗ trợ, đừng ngần ngại liên hệ với đội ngũ hỗ trợ của chúng tôi.</p>
                    <p>Cảm ơn bạn,<br>Đội ngũ Ielttrenmay.com</p>
                </div>
            </body>
            </html>
            """
            
            # Send the custom Vietnamese email
            send_email(new_student.email, subject, html_content)
        except Exception as e:
            print(f"Failed to send welcome email: {str(e)}")
            # Don't block the registration if email fails
    except ImportError:
        # If email utils aren't available, just continue
        pass
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": new_student.user_id,
        "username": new_student.username,
        "email": new_student.email,
        "role": new_student.role
    }
@router.post("/login")
async def admin_login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == form_data.username).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username does not exist",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not pwd_context.verify(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username,
        "user_id": user.user_id,
        "email": user.email,
        "is_active": user.is_active
    }

    
@router.get("/admin/profile", response_model=dict)
async def get_admin_profile(
    request: Request,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    image_url = f"{request.base_url}{current_admin.image_url}" if current_admin.image_url else None
    
    return {
        "user_id": current_admin.user_id,
        "username": current_admin.username,
        "email": current_admin.email,
        "image_url": image_url,
        "role": current_admin.role
    }

@router.put("/admin/profile", response_model=dict)
async def update_admin_profile(
    email: str = Form(None),
    username: str = Form(None),
    image: UploadFile = File(None),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    if email:
        current_admin.email = email
    
    if username:
        current_admin.username = username
    
    if image:
        file_extension = os.path.splitext(image.filename)[1]
        unique_filename = f"{uuid4()}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        with open(file_path, "wb") as buffer:
            content = await image.read()
            buffer.write(content)
        
        current_admin.image_url = file_path

    db.commit()
    db.refresh(current_admin)
    
    return {
        "message": "Profile updated successfully",
        "email": current_admin.email,
        "username": current_admin.username,
        "image_url": current_admin.image_url,
        "role": current_admin.role
    }   
    
@router.post("/create-student", response_model=dict)
def create_student(
    student: CreateStudentRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    vietnam_tz = pytz.timezone('Asia/Ho_Chi_Minh')
    vietnam_time = datetime.now(vietnam_tz)
    
    raw_password = generate_random_password()
    hashed_password = pwd_context.hash(raw_password)
    
    new_student = User(
        username=student.username,
        email=student.email,
        password=hashed_password,
        role="student",
        is_active=True,
        created_at=vietnam_time,
        image_url=student.image_url or DEFAULT_STUDENT_IMAGE,
        status='offline'
    )
    
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    
    return {
        "message": "Student account created successfully",
        "username": student.username,
        "temporary_password": raw_password,
        "image_url": new_student.image_url,
        "status": new_student.status
    }
    
@router.get("/students", response_model=List[dict])
async def get_students(
    request: Request,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    vietnam_tz = pytz.timezone('Asia/Ho_Chi_Minh')
    # Modify the query to exclude admin users
    students = db.query(User).filter(User.role != "admin").all()
    
    return [{
        "user_id": student.user_id, 
        "username": student.username, 
        "created_at": student.created_at.astimezone(vietnam_tz), 
        "email": student.email,
        "image_url": f"http://localhost:8000/static/student_images/{student.image_url.split('/')[-1]}" if student.image_url else None,
        "status": student.status,
        "is_active": student.is_active
    } for student in students]
# admin reset student password
@router.post("/students/{student_id}/reset-password", response_model=dict)
async def reset_student_password(
    student_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    student = db.query(User).filter(User.user_id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    new_password = generate_random_password()
    hashed_password = pwd_context.hash(new_password)
    
    student.password = hashed_password
    db.commit()
    
    return {
        "message": "Password reset successfully",
        "username": student.username,
        "new_temporary_password": new_password
    }

@router.get("/students/{student_id}", response_model=dict)
async def get_student(
    student_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    vietnam_tz = pytz.timezone('Asia/Ho_Chi_Minh')
    user = db.query(User).filter(
        User.user_id == student_id,
        User.role.in_(["student", "customer"])
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")
    return {
         "user_id": user.user_id, 
        "username": user.username, 
        "created_at": user.created_at.astimezone(vietnam_tz), 
        "email": user.email,
       "image_url": f"http://localhost:8000/static/student_images/{user.image_url.split('/')[-1]}" if user.image_url else None,
        "status": user.status,
        "is_active": user.is_active,
        "is_active_student": user.is_active_student
    }
@router.get("/students/student-side/{student_id}", response_model=dict)
async def get_student(
    student_id: int,
    current_admin: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    vietnam_tz = pytz.timezone('Asia/Ho_Chi_Minh')
    student = db.query(User).filter(User.user_id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return {
         "user_id": student.user_id, 
        "username": student.username, 
        "created_at": student.created_at.astimezone(vietnam_tz), 
        "email": student.email,
       "image_url": f"http://localhost:8000/static/student_images/{student.image_url.split('/')[-1]}" if student.image_url else None,
        "status": student.status,
        "is_active": student.is_active,
        "is_active_student": student.is_active_student
    }
@router.put("/students/{student_id}", response_model=dict)
async def update_student(
    student_id: int,
    student_data: UpdateStudentRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    student = db.query(User).filter(
        User.user_id == student_id,
        User.role.in_(["student", "customer"])
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if student_data.email:
        student.email = student_data.email
    
    if student_data.username:
        student.username = student_data.username
        
    if student_data.is_active is not None:
        student.is_active = student_data.is_active
        
    if student_data.is_active_student is not None:
        student.is_active_student = student_data.is_active_student
    
    db.commit()
    db.refresh(student)
    
    return {
        "message": "Student updated successfully",
        "user_id": student.user_id,
        "username": student.username,
        "email": student.email,
        "is_active": student.is_active,
        "is_active_student": student.is_active_student
    }

# Add these endpoints to the auth.py file
@router.post("/activate-account", response_model=dict)
async def activate_student_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Activate a student account for a 2-month period.
    This should be called when a student first logs in after account creation.
    """
    # Ensure this is a student account
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only student accounts can be activated"
        )
        
    # Check if account is already activated
    if current_user.account_activated_at is not None:
        # Calculate remaining days
        expiry_date = current_user.account_activated_at + timedelta(days=60)
        remaining_days = (expiry_date - get_vietnam_time().replace(tzinfo=None)).days
        
        if remaining_days > 0:
            return {
                "message": "Account already activated",
                "user_id": current_user.user_id,
                "activated_at": current_user.account_activated_at,
                "expires_at": expiry_date,
                "remaining_days": remaining_days
            }
    
    # Activate the account
    current_user.account_activated_at = get_vietnam_time().replace(tzinfo=None)
    current_user.is_active = True
    current_user.is_active_student = True
    db.commit()
    
    # Calculate expiry date
    expiry_date = current_user.account_activated_at + timedelta(days=60)
    
    return {
        "message": "Account activated successfully",
        "user_id": current_user.user_id,
        "activated_at": current_user.account_activated_at,
        "expires_at": expiry_date,
        "remaining_days": 60
    }

@router.get("/account-status", response_model=dict)
async def get_account_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the current status of a student account including activation and expiry information.
    """
    # Ensure this is a student account
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only for student accounts"
        )
        
    if current_user.account_activated_at is None:
        return {
            "message": "Account not yet activated",
            "user_id": current_user.user_id,
            "is_active": current_user.is_active,
            "activated_at": None,
            "expires_at": None,
            "remaining_days": None
        }
    
    # Calculate expiry date and remaining days
    expiry_date = current_user.account_activated_at + timedelta(days=60)
    remaining_days = (expiry_date - get_vietnam_time().replace(tzinfo=None)).days
    
    # Determine if account is expired
    account_status = "active" if remaining_days > 0 else "expired"
    
    # Update is_active in database if needed
    if account_status == "expired" and current_user.is_active:
        current_user.is_active = False
        db.commit()
    elif account_status == "active" and not current_user.is_active:
        current_user.is_active = True
        db.commit()
    
    return {
        "message": f"Account is {account_status}",
        "user_id": current_user.user_id,
        "is_active": current_user.is_active,
        "activated_at": current_user.account_activated_at,
        "expires_at": expiry_date,
        "remaining_days": max(0, remaining_days)
    }

 