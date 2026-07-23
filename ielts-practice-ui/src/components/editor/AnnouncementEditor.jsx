import { Editor } from '@tinymce/tinymce-react';
import { API_BASE } from '../../config/api';

// Lean rich-text editor for the homepage "Thông tin mới" body. Supports inserting
// images: they are UPLOADED to the backend (not stored as base64, which would
// overflow the MySQL TEXT column) via /admin/action/upload-image and referenced
// by their /static URL. TinyMCE 7 (Promise-based images_upload_handler).
const APIKEY = 'x8qv7w0pkk74iqgmg44vcmclaec708cuu838bb4jx28o26ur';

export default function AnnouncementEditor({ value, onChange }) {
  const imagesUploadHandler = (blobInfo) =>
    new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append('image', blobInfo.blob(), blobInfo.filename());
      fetch(`${API_BASE}/admin/action/upload-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        body: fd,
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('upload failed'))))
        .then((d) => resolve(`${API_BASE}${d.image_url}`))
        .catch(() => reject('Không tải được ảnh'));
    });

  return (
    <Editor
      apiKey={APIKEY}
      value={value}
      onEditorChange={onChange}
      init={{
        height: 320,
        menubar: false,
        plugins: ['advlist', 'autolink', 'lists', 'link', 'image', 'preview', 'table', 'wordcount'],
        toolbar:
          'undo redo | bold italic underline | forecolor | bullist numlist | link image table | alignleft aligncenter alignright | removeformat',
        automatic_uploads: true,
        paste_data_images: true,
        images_upload_handler: imagesUploadHandler,
        content_style:
          'body{font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.6} img{max-width:100%;height:auto}',
      }}
    />
  );
}
