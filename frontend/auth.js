// Supabase 클라이언트 — window._supabase 로 전역 노출
let _supabase = null;

function initAuth() {
  _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window._supabase = _supabase;
}

// OAuth redirect URL 동적 생성 (localhost / GitHub Pages 모두 대응)
function getRedirectTo() {
  const href = window.location.href.replace(/[^/]*(\?.*)?$/, '');
  return href + 'login.html';
}

// 세션 없으면 login.html 로 이동, 있으면 user 반환
async function requireAuth() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) {
    window.location.href = getRedirectTo();
    return null;
  }
  return session.user;
}

// login.html 에서 호출 — OAuth 콜백 처리 + 로그인 상태면 index.html 로 이동
function setupLoginRedirect() {
  _supabase.auth.onAuthStateChange((event, session) => {
    if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
      const base = window.location.href.replace(/[^/]*(\?.*)?$/, '');
      window.location.href = base + 'index.html';
    }
  });
}

async function signInWithEmail(email, password) {
  return _supabase.auth.signInWithPassword({ email, password });
}

async function signUpWithEmail(email, password) {
  return _supabase.auth.signUp({ email, password });
}

async function signInWithGoogle() {
  const { error } = await _supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: getRedirectTo() },
  });
  if (error) alert('Google 로그인 실패: ' + error.message);
}

async function signInWithGitHub() {
  const { error } = await _supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: getRedirectTo() },
  });
  if (error) alert('GitHub 로그인 실패: ' + error.message);
}

async function signOut() {
  await _supabase.auth.signOut();
  window.location.href = getRedirectTo();
}

// login.html 폼 초기화
function initLoginPage() {
  let currentTab = 'login';
  const form        = document.getElementById('auth-form');
  const emailInput  = document.getElementById('auth-email');
  const pwInput     = document.getElementById('auth-password');
  const submitBtn   = document.getElementById('auth-submit');
  const errorEl     = document.getElementById('auth-error');
  const successEl   = document.getElementById('auth-success');

  const showError   = msg => { errorEl.textContent = msg;   errorEl.classList.remove('hidden');   successEl.classList.add('hidden'); };
  const showSuccess = msg => { successEl.textContent = msg; successEl.classList.remove('hidden'); errorEl.classList.add('hidden'); };
  const clearMsg    = ()  => { errorEl.classList.add('hidden'); successEl.classList.add('hidden'); };

  // 탭 전환
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentTab = tab.dataset.tab;
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t === tab));
      submitBtn.textContent = currentTab === 'login' ? '로그인' : '회원가입';
      clearMsg();
    });
  });

  // 폼 제출
  form.addEventListener('submit', async e => {
    e.preventDefault();
    clearMsg();
    submitBtn.disabled = true;
    submitBtn.textContent = '처리 중...';

    const email    = emailInput.value.trim();
    const password = pwInput.value;

    if (currentTab === 'login') {
      const { error } = await signInWithEmail(email, password);
      if (error) {
        showError(error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = '로그인';
      }
      // 성공 시 setupLoginRedirect 의 onAuthStateChange 가 index.html 로 이동
    } else {
      const { error } = await signUpWithEmail(email, password);
      submitBtn.disabled = false;
      submitBtn.textContent = '회원가입';
      if (error) showError(error.message);
      else showSuccess('가입 완료! 이메일을 확인하거나 바로 로그인하세요.');
    }
  });

  document.getElementById('google-btn').addEventListener('click', signInWithGoogle);
  document.getElementById('github-btn').addEventListener('click', signInWithGitHub);
}

// auth.js 로드 즉시 클라이언트 초기화
initAuth();
