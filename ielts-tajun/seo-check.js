#!/usr/bin/env node

/**
 * SEO Verification Script for thiieltstrenmay.com
 * This script checks various SEO elements to ensure proper configuration
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 SEO Configuration Check for thiieltstrenmay.com\n');

// Check robots.txt
function checkRobotsTxt() {
    console.log('📋 Checking robots.txt...');
    const robotsPath = path.join(__dirname, 'public', 'robots.txt');
    
    if (fs.existsSync(robotsPath)) {
        const content = fs.readFileSync(robotsPath, 'utf8');
        
        // Check for important directives
        const checks = [
            { pattern: /Allow: \/$/m, description: 'Allows homepage' },
            { pattern: /Allow: \/listening_list/m, description: 'Allows listening list' },
            { pattern: /Allow: \/speaking_list/m, description: 'Allows speaking list' },
            { pattern: /Allow: \/writing_list/m, description: 'Allows writing list' },
            { pattern: /Allow: \/reading_list/m, description: 'Allows reading list' },
            { pattern: /Disallow: \/admin\//m, description: 'Blocks admin routes' },
            { pattern: /Disallow: \/\*admin\*/m, description: 'Blocks admin patterns' },
            { pattern: /Sitemap: https:\/\/thiieltstrenmay\.com\/sitemap\.xml/m, description: 'Sitemap reference' }
        ];
        
        checks.forEach(check => {
            if (check.pattern.test(content)) {
                console.log(`  ✅ ${check.description}`);
            } else {
                console.log(`  ❌ Missing: ${check.description}`);
            }
        });
    } else {
        console.log('  ❌ robots.txt not found');
    }
    console.log('');
}

// Check sitemap.xml
function checkSitemap() {
    console.log('🗺️  Checking sitemap.xml...');
    const sitemapPath = path.join(__dirname, 'public', 'sitemap.xml');
    
    if (fs.existsSync(sitemapPath)) {
        const content = fs.readFileSync(sitemapPath, 'utf8');
        
        // Check for important URLs
        const urls = [
            'https://thiieltstrenmay.com/',
            'https://thiieltstrenmay.com/listening_list',
            'https://thiieltstrenmay.com/speaking_list',
            'https://thiieltstrenmay.com/writing_list',
            'https://thiieltstrenmay.com/reading_list',
            'https://thiieltstrenmay.com/vip-packages'
        ];
        
        urls.forEach(url => {
            if (content.includes(url)) {
                console.log(`  ✅ ${url}`);
            } else {
                console.log(`  ❌ Missing: ${url}`);
            }
        });
        
        // Check for recent lastmod dates
        if (content.includes('2024-12-20')) {
            console.log('  ✅ Recent lastmod dates');
        } else {
            console.log('  ❌ Outdated lastmod dates');
        }
    } else {
        console.log('  ❌ sitemap.xml not found');
    }
    console.log('');
}

// Check index.html meta tags
function checkMetaTags() {
    console.log('🏷️  Checking meta tags in index.html...');
    const indexPath = path.join(__dirname, 'public', 'index.html');
    
    if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, 'utf8');
        
        const checks = [
            { pattern: /lang="vi"/m, description: 'Vietnamese language attribute' },
            { pattern: /name="keywords".*thi ielts tren may/m, description: 'Target keywords included' },
            { pattern: /name="description".*Thi IELTS trên máy/m, description: 'SEO-optimized description' },
            { pattern: /property="og:title"/m, description: 'Open Graph title' },
            { pattern: /property="og:description"/m, description: 'Open Graph description' },
            { pattern: /name="twitter:card"/m, description: 'Twitter Card meta' },
            { pattern: /@type.*EducationalOrganization/m, description: 'Structured data' },
            { pattern: /thiieltstrenmay\.com/m, description: 'Domain references' }
        ];
        
        checks.forEach(check => {
            if (check.pattern.test(content)) {
                console.log(`  ✅ ${check.description}`);
            } else {
                console.log(`  ❌ Missing: ${check.description}`);
            }
        });
    } else {
        console.log('  ❌ index.html not found');
    }
    console.log('');
}

// Check .htaccess
function checkHtaccess() {
    console.log('🔒 Checking .htaccess...');
    const htaccessPath = path.join(__dirname, 'public', '.htaccess');
    
    if (fs.existsSync(htaccessPath)) {
        const content = fs.readFileSync(htaccessPath, 'utf8');
        
        const checks = [
            { pattern: /RewriteEngine On/m, description: 'URL rewriting enabled' },
            { pattern: /admin\.thiieltstrenmay\.com/m, description: 'Admin subdomain blocking' },
            { pattern: /X-Robots-Tag.*index, follow/m, description: 'SEO headers' },
            { pattern: /HTTPS.*off/m, description: 'HTTPS redirect' }
        ];
        
        checks.forEach(check => {
            if (check.pattern.test(content)) {
                console.log(`  ✅ ${check.description}`);
            } else {
                console.log(`  ❌ Missing: ${check.description}`);
            }
        });
    } else {
        console.log('  ❌ .htaccess not found');
    }
    console.log('');
}

// Run all checks
function runAllChecks() {
    checkRobotsTxt();
    checkSitemap();
    checkMetaTags();
    checkHtaccess();
    
    console.log('🎯 SEO Recommendations:');
    console.log('1. Submit updated sitemap to Google Search Console');
    console.log('2. Request re-indexing of main pages');
    console.log('3. Monitor search results for "thi ielts tren may" keywords');
    console.log('4. Check Google Search Console for crawl errors');
    console.log('5. Verify that admin.thiieltstrenmay.com redirects properly');
    console.log('\n✨ SEO check completed!');
}

// Run the checks
runAllChecks();