// --- ユーザーデータ ---
const USERS = [
    { id: 'かんた', pass: 'kanta123' },
    { id: 'なお', pass: 'nao456' },
    { id: 'きょうこ', pass: 'kyoko789' },
    { id: 'としひこ', pass: 'toshi000' }
];

// ページネーション管理用
let currentPage = 1;
const tasksPerPage = 10;

// --- 認証 ---
function checkAuth() {
    if (!localStorage.getItem('currentUser') && !window.location.href.includes('login.html')) {
        window.location.href = 'login.html';
    }
}

function handleLogin() {
    const uInput = document.getElementById('username').value;
    const pInput = document.getElementById('password').value;
    const user = USERS.find(u => u.id === uInput && u.pass === pInput);
    if (user) {
        localStorage.setItem('currentUser', user.id);
        window.location.href = 'index.html';
    } else {
        Swal.fire('ログイン失敗', 'ユーザー名またはパスワードが正しくありません', 'error');
    }
}

function handleLogout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

function showCurrentUser() {
    const display = document.getElementById('display-user');
    const user = localStorage.getItem('currentUser');
    if (display && user) {
        display.innerHTML = `<i class="fas fa-user-circle"></i> ${user} さん`;
    }
}

// --- TODO機能（ページネーション対応） ---
function renderTasks() {
    const container = document.getElementById('todo-list-container');
    const controls = document.getElementById('pagination-controls');
    if (!container) return;

    const currentUser = localStorage.getItem('currentUser');
    const allTasks = JSON.parse(localStorage.getItem('myFullTasks')) || [];
    
    // 1. 表示する範囲を計算
    const startIndex = (currentPage - 1) * tasksPerPage;
    const endIndex = startIndex + tasksPerPage;
    const currentTasks = allTasks.slice(startIndex, endIndex);
    const totalPages = Math.ceil(allTasks.length / tasksPerPage) || 1;

    // 2. リストの描画
    if (allTasks.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#a0aec0;">タスクはありません</p>';
        controls.innerHTML = '';
        return;
    }

    container.innerHTML = currentTasks.map((t, i) => {
        const isMine = t.userId === currentUser;
        // 全体配列の中の本当のインデックスを取得（削除用）
        const realIndex = startIndex + i; 
        return `
            <div class="task-card ${t.priority} ${isMine ? '' : 'other-user'}">
                <input type="checkbox" ${t.done ? 'checked' : ''} ${isMine ? '' : 'disabled'} onchange="toggleDone(${realIndex})">
                <div style="flex:1; ${t.done ? 'text-decoration:line-through; opacity:0.5' : ''}">
                    <span style="font-size:0.8rem; color:var(--accent); font-weight:bold;">@${t.userId}</span><br>
                    <strong style="font-size:1.15rem">${t.name}</strong><br>
                    <small style="color:#718096"><i class="far fa-clock"></i> ${t.deadline ? t.deadline.replace('T',' ') : '期限なし'}</small>
                </div>
                ${isMine ? `<button onclick="deleteTask(${realIndex})" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:1.5rem;">&times;</button>` : ''}
            </div>
        `;
    }).join('');

    // 3. ページネーションボタンの描画
    if (allTasks.length > tasksPerPage) {
        controls.innerHTML = `
            <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(-1)">前へ</button>
            <span class="page-info">${currentPage} / ${totalPages}</span>
            <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(1)">次へ</button>
        `;
    } else {
        controls.innerHTML = '';
    }
}

function changePage(step) {
    currentPage += step;
    renderTasks();
    window.scrollTo(0, 0); // ページ切り替え時に上に戻る
}

function addTask() {
    const nameInput = document.getElementById('task-name');
    if (!nameInput.value) return;
    const currentUser = localStorage.getItem('currentUser');
    const tasks = JSON.parse(localStorage.getItem('myFullTasks')) || [];
    const taskId = Date.now().toString();
    const deadline = document.getElementById('task-deadline').value;

    // 新しいタスクを先頭に追加（最新が1ページ目に来るように）
    tasks.unshift({
        id: taskId,
        userId: currentUser,
        name: nameInput.value,
        priority: document.getElementById('task-priority').value,
        deadline: deadline,
        done: false
    });
    localStorage.setItem('myFullTasks', JSON.stringify(tasks));

    if (deadline) {
        const evs = JSON.parse(localStorage.getItem('calEvents')) || [];
        evs.push({
            id: 'todo-' + taskId,
            userId: currentUser,
            title: `[TODO] ${nameInput.value}`,
            start: deadline,
            backgroundColor: '#a0aec0',
            extendedProps: { userId: currentUser, isTodo: true, todoId: taskId }
        });
        localStorage.setItem('calEvents', JSON.stringify(evs));
    }

    nameInput.value = '';
    currentPage = 1; // 追加後は1ページ目に戻る
    renderTasks();
}

function deleteTask(realIndex) {
    const tasks = JSON.parse(localStorage.getItem('myFullTasks')) || [];
    const target = tasks[realIndex];
    
    let evs = JSON.parse(localStorage.getItem('calEvents')) || [];
    evs = evs.filter(e => e.id !== 'todo-' + target.id);
    localStorage.setItem('calEvents', JSON.stringify(evs));

    tasks.splice(realIndex, 1);
    localStorage.setItem('myFullTasks', JSON.stringify(tasks));
    
    // ページ内にタスクがなくなったら前のページへ
    if (tasks.length <= (currentPage - 1) * tasksPerPage && currentPage > 1) {
        currentPage--;
    }
    renderTasks();
}

function toggleDone(realIndex) {
    const tasks = JSON.parse(localStorage.getItem('myFullTasks')) || [];
    tasks[realIndex].done = !tasks[realIndex].done;
    localStorage.setItem('myFullTasks', JSON.stringify(tasks));
    renderTasks();
}

// --- カレンダー・データ操作 ---
function saveEvent(ev) {
    const evs = JSON.parse(localStorage.getItem('calEvents')) || [];
    evs.push(ev);
    localStorage.setItem('calEvents', JSON.stringify(evs));
}

function deleteEvent(id) {
    let evs = JSON.parse(localStorage.getItem('calEvents')) || [];
    evs = evs.filter(e => e.id !== id);
    localStorage.setItem('calEvents', JSON.stringify(evs));
}

function deleteLinkedTodo(todoId) {
    let tasks = JSON.parse(localStorage.getItem('myFullTasks')) || [];
    tasks = tasks.filter(t => t.id !== todoId);
    localStorage.setItem('myFullTasks', JSON.stringify(tasks));
    renderTasks(); // 表示を更新
}