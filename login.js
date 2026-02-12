document.addEventListener("DOMContentLoaded", function () {


const API_BACKUP = 'https://phatdevauthvip.netlify.app/.netlify/functions/auth';
const API_PRIMARY = 'https://severkeyvip-kdqp.vercel.app/';

function showAlert(message, type = 'danger') {
    const alert = document.getElementById('alertMessage');
    alert.innerHTML = message;
    alert.className = `alert alert-${type}`;
    alert.style.display = 'block';
}

function hideAlert() {
    document.getElementById('alertMessage').style.display = 'none';
}

async function callAPI(action, data = {}) {
    try {
        const response = await fetch(API_PRIMARY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action, ...data })
        });

        if (!response.ok) {
            throw new Error('Primary HTTP ' + response.status);
        }

        const result = await response.json();
        return result;

    } catch (err) {
        // Fallback to backup API
    }

    const response2 = await fetch(API_BACKUP, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...data })
    });

    if (!response2.ok) {
        throw new Error('Backup HTTP ' + response2.status);
    }

    const result2 = await response2.json();
    return result2;
}

async function checkUserPermission(userId) {
    try {
        const supportResult = await callAPI('check_support', { user_id: userId });

        if (!supportResult.success || supportResult.is_support === false) {
            return {
                allowed: false,
                role: 'user',
                message: 'ID này không có trong danh sách hỗ trợ!'
            };
        }

        const permissionResult = await callAPI('check_permission', {
            user_id: userId,
            api: 'admin_check'
        });

        const isAdmin = permissionResult.success && permissionResult.is_admin;

        return {
            allowed: true,
            role: isAdmin ? 'admin' : 'support',
            isAdmin: isAdmin,
            isSupport: true,
            appCount: permissionResult.app_count || 0,
            maxApps: permissionResult.max_apps || 0
        };

    } catch (error) {
        return {
            allowed: false,
            role: 'error',
            message: 'Lỗi kết nối server khi kiểm tra quyền.'
        };
    }
}

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const userId = document.getElementById('userId').value.trim();
    const loginBtn = document.getElementById('loginBtn');
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');

    if (!userId) {
        showAlert('Vui lòng nhập Discord ID');
        return;
    }

    btnText.innerHTML = 'Đang kiểm tra quyền...';
    btnLoader.style.display = 'inline-block';
    loginBtn.disabled = true;
    hideAlert();

    try {
        const testResult = await callAPI('test');

        if (!testResult.success) {
            showAlert('API server không phản hồi. Vui lòng thử lại sau.');
            resetLoginButton();
            return;
        }

        const permission = await checkUserPermission(userId);

        if (permission.allowed) {
            localStorage.setItem('auth_user_id', userId);
            localStorage.setItem('auth_role', permission.role);
            localStorage.setItem('auth_isAdmin', permission.isAdmin);
            localStorage.setItem('auth_isSupport', permission.isSupport);
            localStorage.setItem('auth_timestamp', Date.now());

            const roleLabel = permission.role === 'admin'
                ? '<i class="fas fa-crown" style="color: #f8961e;"></i> Quản trị viên'
                : '<i class="fas fa-user-shield" style="color: #4361ee;"></i> Hỗ trợ viên';

            showAlert(`Đăng nhập thành công với vai trò: ${roleLabel}`, 'success');

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showAlert(permission.message || 'Bạn không có quyền truy cập hệ thống!');
            resetLoginButton();
        }
    } catch (error) {
        showAlert('Lỗi kết nối API: ' + (error.message || error));
        resetLoginButton();
    }
});

function resetLoginButton() {
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    const loginBtn = document.getElementById('loginBtn');

    btnText.innerHTML = '<i class="fas fa-sign-in-alt"></i> Đăng nhập';
    btnLoader.style.display = 'none';
    loginBtn.disabled = false;
}

document.getElementById('userId').focus();

if (localStorage.getItem('auth_user_id')) {
    const timestamp = localStorage.getItem('auth_timestamp');
    const hoursDiff = (Date.now() - timestamp) / (1000 * 60 * 60);

    if (hoursDiff < 24) {
        window.location.href = 'dashboard.html';
    } else {
        localStorage.clear();
    }
}

window.addEventListener('load', async () => {
    try {
        const testResult = await callAPI('test');
        if (testResult.success) {
            // API connected successfully
        }
    } catch (error) {
        // API connection failed
    }
});
});