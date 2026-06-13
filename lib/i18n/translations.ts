export const LANGS = ['ko', 'en', 'ja', 'zh', 'zh-TW', 'th', 'id', 'vi', 'tl', 'es'] as const
export type Lang = typeof LANGS[number]

export const LANG_LABELS: Record<Lang, string> = {
  ko: '한국어', en: 'English', ja: '日本語', zh: '中文(简体)',
  'zh-TW': '中文(繁體)', th: 'ภาษาไทย', id: 'Bahasa Indonesia',
  vi: 'Tiếng Việt', tl: 'Filipino', es: 'Español',
}

const t = {
  // ── Nav ──────────────────────────────────────────────
  nav: {
    home:      ['홈', 'Home', 'ホーム', '首页', '首頁', 'หน้าหลัก', 'Beranda', 'Trang chủ', 'Tahanan', 'Inicio'],
    explore:   ['탐색', 'Explore', '探索', '探索', '探索', 'สำรวจ', 'Jelajahi', 'Khám phá', 'I-explore', 'Explorar'],
    auditions: ['오디션', 'Auditions', 'オーディション', '试镜', '試鏡', 'ออดิชัน', 'Audisi', 'Thử vai', 'Audisyon', 'Audición'],
    upload:    ['올리기', 'Upload', 'アップ', '上传', '上傳', 'อัปโหลด', 'Unggah', 'Tải lên', 'I-upload', 'Subir'],
    activity:  ['반응', 'Activity', '通知', '动态', '動態', 'กิจกรรม', 'Aktivitas', 'Hoạt động', 'Aktibidad', 'Actividad'],
  },

  // ── Common ───────────────────────────────────────────
  common: {
    save:       ['저장', 'Save', '保存', '保存', '儲存', 'บันทึก', 'Simpan', 'Lưu', 'I-save', 'Guardar'],
    cancel:     ['취소', 'Cancel', 'キャンセル', '取消', '取消', 'ยกเลิก', 'Batal', 'Hủy', 'Kanselahin', 'Cancelar'],
    edit:       ['편집', 'Edit', '編集', '编辑', '編輯', 'แก้ไข', 'Edit', 'Chỉnh sửa', 'I-edit', 'Editar'],
    delete:     ['삭제', 'Delete', '削除', '删除', '刪除', 'ลบ', 'Hapus', 'Xóa', 'I-delete', 'Eliminar'],
    confirm:    ['확인', 'Confirm', '確認', '确认', '確認', 'ยืนยัน', 'Konfirmasi', 'Xác nhận', 'Kumpirmahin', 'Confirmar'],
    loading:    ['불러오는 중...', 'Loading...', '読み込み中...', '加载中...', '載入中...', 'กำลังโหลด...', 'Memuat...', 'Đang tải...', 'Naglo-load...', 'Cargando...'],
    error:      ['오류가 발생했어요', 'An error occurred', 'エラーが発生しました', '发生错误', '發生錯誤', 'เกิดข้อผิดพลาด', 'Terjadi kesalahan', 'Đã xảy ra lỗi', 'May naganap na error', 'Ocurrió un error'],
    back:       ['뒤로', 'Back', '戻る', '返回', '返回', 'กลับ', 'Kembali', 'Quay lại', 'Bumalik', 'Volver'],
    next:       ['다음', 'Next', '次へ', '下一步', '下一步', 'ถัดไป', 'Selanjutnya', 'Tiếp theo', 'Susunod', 'Siguiente'],
    submit:     ['제출', 'Submit', '送信', '提交', '提交', 'ส่ง', 'Kirim', 'Gửi', 'Isumite', 'Enviar'],
    search:     ['검색', 'Search', '検索', '搜索', '搜尋', 'ค้นหา', 'Cari', 'Tìm kiếm', 'Maghanap', 'Buscar'],
    close:      ['닫기', 'Close', '閉じる', '关闭', '關閉', 'ปิด', 'Tutup', 'Đóng', 'Isara', 'Cerrar'],
    viewAll:    ['전체 보기', 'View all', 'すべて見る', '查看全部', '查看全部', 'ดูทั้งหมด', 'Lihat semua', 'Xem tất cả', 'Tingnan lahat', 'Ver todo'],
    verified:   ['인증', 'Verified', '認証済み', '已认证', '已認證', 'ยืนยันแล้ว', 'Terverifikasi', 'Đã xác minh', 'Verified', 'Verificado'],
    talent:     ['지망생', 'Talent', '志望者', '选手', '選手', 'นักออดิชัน', 'Bakat', 'Thí sinh', 'Talento', 'Talento'],
    uploadDone: ['업로드 완료 · 교체하기', 'Uploaded · Replace', 'アップロード完了 · 変更', '上传完成 · 更换', '上傳完成 · 更換', 'อัปโหลดเสร็จ · เปลี่ยน', 'Diunggah · Ganti', 'Đã tải lên · Thay thế', 'Na-upload · Palitan', 'Subido · Reemplazar'],
  },

  // ── Auth ─────────────────────────────────────────────
  auth: {
    tagline:         ['기획사가 직접 발굴하는 오디션 플랫폼', 'The audition platform where agencies find you', '芸能事務所が直接スカウトするオーディションプラットフォーム', '经纪公司直接发掘人才的试镜平台', '經紀公司直接發掘人才的試鏡平台', 'แพลตฟอร์มออดิชันที่ค่ายเพลงค้นหาคุณเอง', 'Platform audisi tempat agensi menemukan kamu', 'Nền tảng thử vai nơi các công ty phát hiện bạn', 'Ang platform ng audisyon kung saan hinahanap ka ng mga ahensya', 'La plataforma de audiciones donde las agencias te encuentran'],
    loginTitle:      ['로그인', 'Log in', 'ログイン', '登录', '登入', 'เข้าสู่ระบบ', 'Masuk', 'Đăng nhập', 'Mag-login', 'Iniciar sesión'],
    loginGoogle:     ['Google로 로그인', 'Continue with Google', 'Googleでログイン', '使用Google登录', '使用Google登入', 'เข้าสู่ระบบด้วย Google', 'Masuk dengan Google', 'Đăng nhập bằng Google', 'Mag-login gamit ang Google', 'Continuar con Google'],
    loginEmail:      ['이메일로 로그인', 'Log in with email', 'メールでログイン', '用邮箱登录', '用郵箱登入', 'เข้าสู่ระบบด้วยอีเมล', 'Masuk dengan email', 'Đăng nhập bằng email', 'Mag-login gamit ang email', 'Iniciar sesión con email'],
    emailPlaceholder:['이메일', 'Email', 'メールアドレス', '邮箱', '郵箱', 'อีเมล', 'Email', 'Email', 'Email', 'Correo electrónico'],
    passwordPlaceholder: ['비밀번호', 'Password', 'パスワード', '密码', '密碼', 'รหัสผ่าน', 'Kata sandi', 'Mật khẩu', 'Password', 'Contraseña'],
    loginBtn:        ['로그인', 'Log in', 'ログイン', '登录', '登入', 'เข้าสู่ระบบ', 'Masuk', 'Đăng nhập', 'Mag-login', 'Iniciar sesión'],
    loggingIn:       ['로그인 중...', 'Logging in...', 'ログイン中...', '登录中...', '登入中...', 'กำลังเข้าสู่ระบบ...', 'Sedang masuk...', 'Đang đăng nhập...', 'Naglo-login...', 'Iniciando sesión...'],
    loginError:      ['이메일 또는 비밀번호가 올바르지 않아요.', 'Incorrect email or password.', 'メールアドレスまたはパスワードが正しくありません。', '邮箱或密码不正确。', '郵箱或密碼不正確。', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'Email atau kata sandi salah.', 'Email hoặc mật khẩu không đúng.', 'Mali ang email o password.', 'Email o contraseña incorrectos.'],
    noAccount:       ['계정이 없으신가요?', "Don't have an account?", 'アカウントをお持ちでないですか?', '没有账号?', '沒有帳號?', 'ยังไม่มีบัญชี?', 'Belum punya akun?', 'Chưa có tài khoản?', 'Wala pang account?', '¿No tienes cuenta?'],
    signupLink:      ['가입하기', 'Sign up', '登録する', '注册', '註冊', 'สมัครสมาชิก', 'Daftar', 'Đăng ký', 'Mag-sign up', 'Registrarse'],
    hasAccount:      ['이미 계정이 있으신가요?', 'Already have an account?', 'すでにアカウントをお持ちですか?', '已有账号?', '已有帳號?', 'มีบัญชีอยู่แล้ว?', 'Sudah punya akun?', 'Đã có tài khoản?', 'Mayroon nang account?', '¿Ya tienes cuenta?'],
    loginLink:       ['로그인', 'Log in', 'ログイン', '登录', '登入', 'เข้าสู่ระบบ', 'Masuk', 'Đăng nhập', 'Mag-login', 'Iniciar sesión'],
    kakaoBlock:      ['카카오톡에서는 구글 로그인이 차단돼요.\n이메일로 로그인하세요.', 'Google login is blocked in KakaoTalk.\nPlease log in with email.', 'カカオトークではGoogleログインが制限されています。\nメールでログインしてください。', '在KakaoTalk中Google登录被阻止。\n请使用邮箱登录。', '在KakaoTalk中Google登入被阻止。\n請使用郵箱登入。', 'Google login ถูกบล็อกใน KakaoTalk\nโปรดเข้าสู่ระบบด้วยอีเมล', 'Login Google diblokir di KakaoTalk.\nSilakan login dengan email.', 'Đăng nhập Google bị chặn trong KakaoTalk.\nVui lòng đăng nhập bằng email.', 'Naka-block ang Google login sa KakaoTalk.\nMag-login gamit ang email.', 'El login de Google está bloqueado en KakaoTalk.\nInicia sesión con email.'],

    // Signup
    signupTitle:     ['Kpick 가입', 'Join Kpick', 'Kpickに登録', '注册Kpick', '註冊Kpick', 'สมัคร Kpick', 'Daftar Kpick', 'Đăng ký Kpick', 'Sumali sa Kpick', 'Únete a Kpick'],
    signupStepRole:  ['어떤 계정으로 가입할까요?', 'What type of account?', 'どのアカウントで登録しますか?', '选择账号类型', '選擇帳號類型', 'เลือกประเภทบัญชี', 'Pilih jenis akun', 'Chọn loại tài khoản', 'Pumili ng uri ng account', '¿Qué tipo de cuenta?'],
    signupStepMethod:['가입 방법을 선택해주세요', 'Choose a sign-up method', '登録方法を選択してください', '选择注册方式', '選擇註冊方式', 'เลือกวิธีสมัคร', 'Pilih metode daftar', 'Chọn phương thức đăng ký', 'Pumili ng paraan ng pag-sign up', 'Elige un método de registro'],
    signupStepForm:  ['기본 정보를 입력해주세요', 'Enter your basic info', '基本情報を入力してください', '填写基本信息', '填寫基本資訊', 'กรอกข้อมูลพื้นฐาน', 'Masukkan info dasar', 'Nhập thông tin cơ bản', 'Ilagay ang basic na impormasyon', 'Ingresa tu información básica'],
    roleTalent:      ['오디션 지망생', 'Aspiring talent', 'オーディション志望者', '才艺学员', '才藝學員', 'นักออดิชัน', 'Calon bakat', 'Thí sinh tài năng', 'Mag-aaplay na talento', 'Aspirante'],
    roleTalentDesc:  ['영상을 올리고 기획사에 노출돼요', 'Upload videos and get discovered by agencies', '動画をアップして事務所に見てもらえます', '上传视频，获得经纪公司关注', '上傳影片，獲得經紀公司關注', 'อัปโหลดวิดีโอและถูกค้นพบโดยค่ายเพลง', 'Upload video dan ditemukan oleh agensi', 'Tải video lên và được các công ty phát hiện', 'Mag-upload ng video at matuklasan ng mga ahensya', 'Sube videos y sé descubierto por agencias'],
    roleAgency:      ['기획사 담당자', 'Agency staff', '芸能事務所担当者', '经纪公司负责人', '經紀公司負責人', 'เจ้าหน้าที่ค่ายเพลง', 'Staf agensi', 'Nhân viên công ty', 'Kawani ng ahensya', 'Personal de agencia'],
    roleAgencyDesc:  ['지망생 영상을 탐색하고 연락해요', 'Browse talent videos and reach out', '志望者の動画を探してコンタクトを取れます', '浏览学员视频并联系', '瀏覽學員影片並聯繫', 'เรียกดูวิดีโอของนักออดิชันและติดต่อ', 'Telusuri video bakat dan hubungi mereka', 'Duyệt video tài năng và liên hệ', 'I-browse ang mga video ng talento at makipag-ugnayan', 'Explora videos de talentos y contáctalos'],
    signupGoogle:    ['Google로 가입', 'Sign up with Google', 'Googleで登録', '使用Google注册', '使用Google註冊', 'สมัครด้วย Google', 'Daftar dengan Google', 'Đăng ký bằng Google', 'Mag-sign up gamit ang Google', 'Registrarse con Google'],
    signupEmailBtn:  ['이메일로 가입', 'Sign up with email', 'メールで登録', '用邮箱注册', '用郵箱註冊', 'สมัครด้วยอีเมล', 'Daftar dengan email', 'Đăng ký bằng email', 'Mag-sign up gamit ang email', 'Registrarse con email'],
    namePlaceholder: ['이름', 'Name', '名前', '姓名', '姓名', 'ชื่อ', 'Nama', 'Tên', 'Pangalan', 'Nombre'],
    agencyNamePlaceholder: ['기획사명 *', 'Agency name *', '事務所名 *', '经纪公司名称 *', '經紀公司名稱 *', 'ชื่อค่ายเพลง *', 'Nama agensi *', 'Tên công ty *', 'Pangalan ng ahensya *', 'Nombre de la agencia *'],
    bizRegUpload:    ['명함 업로드', 'Upload business card', '名刺をアップロード', '上传名片', '上傳名片', 'อัปโหลดนามบัตร', 'Upload kartu nama', 'Tải lên danh thiếp', 'I-upload ang business card', 'Subir tarjeta de visita'],
    bizRegUploading: ['업로드 중...', 'Uploading...', 'アップロード中...', '上传中...', '上傳中...', 'กำลังอัปโหลด...', 'Mengunggah...', 'Đang tải lên...', 'Nag-a-upload...', 'Subiendo...'],
    bizRegRequired:  ['명함을 업로드해주세요', 'Please upload your business card', '名刺をアップロードしてください', '请上传名片', '請上傳名片', 'โปรดอัปโหลดนามบัตร', 'Silakan upload kartu nama', 'Vui lòng tải lên danh thiếp', 'Mangyaring i-upload ang iyong business card', 'Por favor sube tu tarjeta de visita'],
    passwordMinPlaceholder: ['비밀번호 (6자 이상)', 'Password (min. 6 chars)', 'パスワード（6文字以上）', '密码（至少6位）', '密碼（至少6位）', 'รหัสผ่าน (อย่างน้อย 6 ตัว)', 'Kata sandi (min. 6 karakter)', 'Mật khẩu (tối thiểu 6 ký tự)', 'Password (min. 6 na karakter)', 'Contraseña (mín. 6 caracteres)'],
    signingUp:       ['가입 중...', 'Signing up...', '登録中...', '注册中...', '註冊中...', 'กำลังสมัคร...', 'Mendaftar...', 'Đang đăng ký...', 'Nagsasign up...', 'Registrando...'],
    signupBtn:       ['가입하기', 'Sign up', '登録する', '注册', '註冊', 'สมัครสมาชิก', 'Daftar', 'Đăng ký', 'Mag-sign up', 'Registrarse'],
    signupDone:      ['가입 완료! 이제 Kpick을 시작해보세요 🎉', 'Welcome to Kpick! 🎉', 'Kpickへようこそ！🎉', '注册成功！欢迎来到Kpick 🎉', '註冊成功！歡迎來到Kpick 🎉', 'ยินดีต้อนรับสู่ Kpick! 🎉', 'Selamat datang di Kpick! 🎉', 'Chào mừng đến với Kpick! 🎉', 'Maligayang pagdating sa Kpick! 🎉', '¡Bienvenido a Kpick! 🎉'],
    goToDashboard:   ['시작하기', 'Get started', 'スタート', '开始', '開始', 'เริ่มต้น', 'Mulai', 'Bắt đầu', 'Magsimula', 'Comenzar'],
  },

  // ── Dashboard ────────────────────────────────────────
  dashboard: {
    greeting:        ['안녕하세요', 'Hello', 'こんにちは', '你好', '你好', 'สวัสดี', 'Halo', 'Xin chào', 'Kumusta', 'Hola'],
    bookmarks:       ['관심', 'Bookmarks', 'ブックマーク', '关注', '關注', 'บุ๊กมาร์ก', 'Bookmark', 'Đánh dấu', 'Bookmark', 'Favoritos'],
    chats:           ['채팅', 'Chats', 'チャット', '聊天', '聊天', 'แชท', 'Chat', 'Chat', 'Chat', 'Chats'],
    myVideos:        ['내 영상', 'My Videos', 'マイ動画', '我的视频', '我的影片', 'วิดีโอของฉัน', 'Video saya', 'Video của tôi', 'Aking mga video', 'Mis videos'],
    videoCount:      ['내 영상 총', 'Total', '合計', '共', '共', 'รวม', 'Total', 'Tổng cộng', 'Kabuuan', 'Total'],
    videoCountUnit:  ['개', '', '本', '个', '個', 'วิดีโอ', 'video', 'video', 'video', 'videos'],
    viewVideos:      ['영상 보러가기', 'View videos', '動画を見る', '查看视频', '查看影片', 'ดูวิดีโอ', 'Lihat video', 'Xem video', 'Tingnan ang mga video', 'Ver videos'],
    uploadFirst:     ['영상 올리기 시작하기', 'Start uploading', '動画をアップしよう', '开始上传视频', '開始上傳影片', 'เริ่มอัปโหลดวิดีโอ', 'Mulai upload video', 'Bắt đầu tải video', 'Magsimulang mag-upload', 'Empieza a subir videos'],
    agencyInterest:  ['기획사 관심', 'Agency Interest', '事務所からの関心', '经纪公司关注', '經紀公司關注', 'ความสนใจจากค่ายเพลง', 'Minat agensi', 'Sự quan tâm từ công ty', 'Interes ng ahensya', 'Interés de agencias'],
    noBookmarks:     ['아직 나에게 관심을 보인 기획사가 없어요', 'No agency has shown interest yet', 'まだ事務所からの関心はありません', '还没有经纪公司对你感兴趣', '還沒有經紀公司對你感興趣', 'ยังไม่มีค่ายเพลงสนใจคุณ', 'Belum ada agensi yang tertarik', 'Chưa có công ty nào quan tâm', 'Wala pang ahensyang nagpakita ng interes', 'Ninguna agencia ha mostrado interés aún'],
    bookmarkDesc:    ['영상을 올리면 기획사 담당자들이 볼 수 있어요', 'Upload videos for agencies to discover you', '動画をアップすると事務所の担当者が見られます', '上传视频让经纪公司发现你', '上傳影片讓經紀公司發現你', 'อัปโหลดวิดีโอเพื่อให้ค่ายเพลงค้นพบคุณ', 'Upload video agar ditemukan agensi', 'Tải video lên để các công ty phát hiện bạn', 'Mag-upload ng video para matuklasan ng mga ahensya', 'Sube videos para que las agencias te descubran'],
    openAuditions:   ['열린 오디션', 'Open Auditions', '開催中のオーディション', '进行中的试镜', '進行中的試鏡', 'ออดิชันที่เปิดรับ', 'Audisi terbuka', 'Buổi thử vai đang mở', 'Bukas na mga Audisyon', 'Audiciones abiertas'],
    activeCount:     ['개 진행중', ' active', '件開催中', '个进行中', '個進行中', 'ที่กำลังดำเนินการ', 'sedang berlangsung', 'đang diễn ra', 'aktibo', 'activas'],
    noAuditions:     ['현재 열린 오디션이 없어요', 'No open auditions right now', '現在開催中のオーディションはありません', '目前没有进行中的试镜', '目前沒有進行中的試鏡', 'ไม่มีออดิชันที่เปิดรับขณะนี้', 'Tidak ada audisi terbuka saat ini', 'Hiện không có buổi thử vai nào', 'Walang bukas na audisyon ngayon', 'No hay audiciones abiertas ahora'],
    auditionDesc:    ['새 오디션 공고가 올라오면 알림을 드릴게요', 'You\'ll be notified when new auditions open', '新しいオーディションが始まるとお知らせします', '有新试镜公告时将通知您', '有新試鏡公告時將通知您', 'คุณจะได้รับการแจ้งเตือนเมื่อมีออดิชันใหม่', 'Anda akan diberi tahu ketika ada audisi baru', 'Bạn sẽ được thông báo khi có buổi thử vai mới', 'Aabisuhan ka kapag may bagong audisyon', 'Te notificaremos cuando abran nuevas audiciones'],
    viewAuditions:   ['오디션 보러가기', 'View auditions', 'オーディションを見る', '查看试镜', '查看試鏡', 'ดูออดิชัน', 'Lihat audisi', 'Xem thử vai', 'Tingnan ang mga audisyon', 'Ver audiciones'],
    completeProfile: ['프로필 완성해보세요', 'Complete your profile', 'プロフィールを完成させよう', '完善个人资料', '完善個人資料', 'กรอกโปรไฟล์ให้ครบ', 'Lengkapi profilmu', 'Hoàn thiện hồ sơ', 'Kumpletuhin ang iyong profile', 'Completa tu perfil'],
    profileDesc:     ['자기소개를 추가하면 기획사에 더 잘 보여요', 'Adding a bio helps agencies notice you', '自己紹介を追加すると事務所に見つけてもらいやすくなります', '添加自我介绍有助于吸引经纪公司', '添加自我介紹有助於吸引經紀公司', 'การเพิ่มประวัติช่วยให้ค่ายเพลงสังเกตเห็นคุณ', 'Menambahkan bio membantu agensi memperhatikanmu', 'Thêm tiểu sử giúp các công ty chú ý đến bạn', 'Ang pagdaragdag ng bio ay nakakatulong sa mga ahensya na mapansin ka', 'Agregar una bio ayuda a las agencias a notarte'],
    addBio:          ['+ 자기소개 추가하기', '+ Add bio', '+ 自己紹介を追加', '+ 添加自我介绍', '+ 添加自我介紹', '+ เพิ่มประวัติ', '+ Tambah bio', '+ Thêm tiểu sử', '+ Magdagdag ng bio', '+ Agregar bio'],
    addVideo:        ['새 영상 추가', 'Add video', '動画を追加', '添加视频', '添加影片', 'เพิ่มวิดีโอ', 'Tambah video', 'Thêm video', 'Magdagdag ng video', 'Agregar video'],
    chatWith:        ['채팅 확인하기', 'View chat', 'チャットを確認', '查看聊天', '查看聊天', 'ดูแชท', 'Lihat chat', 'Xem chat', 'Tingnan ang chat', 'Ver chat'],
    invited:         ['초대됨', 'Invited', '招待済み', '已邀请', '已邀請', 'ได้รับเชิญ', 'Diundang', 'Được mời', 'Inimbitahan', 'Invitado'],
  },

  // ── Videos ───────────────────────────────────────────
  videos: {
    myVideos:        ['내 영상', 'My Videos', 'マイ動画', '我的视频', '我的影片', 'วิดีโอของฉัน', 'Video saya', 'Video của tôi', 'Aking mga video', 'Mis videos'],
    noVideos:        ['아직 올린 영상이 없어요', 'No videos yet', 'まだ動画がありません', '还没有视频', '還沒有影片', 'ยังไม่มีวิดีโอ', 'Belum ada video', 'Chưa có video', 'Wala pang video', 'Sin videos aún'],
    uploadNow:       ['지금 올리기', 'Upload now', '今すぐアップ', '立即上传', '立即上傳', 'อัปโหลดเลย', 'Unggah sekarang', 'Tải lên ngay', 'Mag-upload na', 'Subir ahora'],
    uploadVideo:     ['영상 올리기', 'Upload video', '動画をアップ', '上传视频', '上傳影片', 'อัปโหลดวิดีโอ', 'Upload video', 'Tải video lên', 'Mag-upload ng video', 'Subir video'],
    selectFile:      ['파일 선택', 'Select file', 'ファイルを選択', '选择文件', '選擇文件', 'เลือกไฟล์', 'Pilih file', 'Chọn tệp', 'Pumili ng file', 'Seleccionar archivo'],
    titlePlaceholder:['제목', 'Title', 'タイトル', '标题', '標題', 'ชื่อเรื่อง', 'Judul', 'Tiêu đề', 'Pamagat', 'Título'],
    categoryLabel:   ['카테고리', 'Category', 'カテゴリー', '类别', '類別', 'ประเภท', 'Kategori', 'Danh mục', 'Kategorya', 'Categoría'],
    vocal:           ['보컬', 'Vocal', 'ボーカル', '声乐', '聲樂', 'ร้องเพลง', 'Vokal', 'Giọng hát', 'Vocal', 'Vocal'],
    dance:           ['댄스', 'Dance', 'ダンス', '舞蹈', '舞蹈', 'เต้น', 'Tari', 'Nhảy', 'Sayaw', 'Baile'],
    acting:          ['연기', 'Acting', '演技', '表演', '表演', 'การแสดง', 'Akting', 'Diễn xuất', 'Pag-arte', 'Actuación'],
    rap:             ['랩', 'Rap', 'ラップ', '说唱', '說唱', 'แร็พ', 'Rap', 'Rap', 'Rap', 'Rap'],
    other:           ['기타', 'Other', 'その他', '其他', '其他', 'อื่นๆ', 'Lainnya', 'Khác', 'Iba pa', 'Otro'],
    uploading:       ['업로드 중...', 'Uploading...', 'アップロード中...', '上传中...', '上傳中...', 'กำลังอัปโหลด...', 'Mengunggah...', 'Đang tải lên...', 'Nag-a-upload...', 'Subiendo...'],
    uploadDone:      ['업로드 완료!', 'Upload complete!', 'アップロード完了！', '上传完成！', '上傳完成！', 'อัปโหลดสำเร็จ!', 'Upload selesai!', 'Tải lên hoàn tất!', 'Tapos na ang pag-upload!', '¡Subida completa!'],
    uploadTitle:     ['영상 업로드', 'Upload Video', '動画アップロード', '上传视频', '上傳影片', 'อัปโหลดวิดีโอ', 'Upload Video', 'Tải lên Video', 'Mag-upload ng Video', 'Subir Video'],
    titleRequired:   ['영상 제목 *', 'Video title *', '動画タイトル *', '视频标题 *', '影片標題 *', 'ชื่อวิดีโอ *', 'Judul video *', 'Tiêu đề video *', 'Pamagat ng video *', 'Título de video *'],
    descPlaceholder: ['설명 (선택사항)', 'Description (optional)', '説明（任意）', '描述（可选）', '描述（可選）', 'คำอธิบาย (ไม่จำเป็น)', 'Deskripsi (opsional)', 'Mô tả (tùy chọn)', 'Paglalarawan (opsyonal)', 'Descripción (opcional)'],
    tagsPlaceholder: ['태그 (쉼표로 구분)', 'Tags (comma-separated)', 'タグ（カンマ区切り）', '标签（逗号分隔）', '標籤（逗號分隔）', 'แท็ก (คั่นด้วยเครื่องหมายจุลภาค)', 'Tag (dipisah koma)', 'Thẻ (phân cách bằng dấu phẩy)', 'Mga tag (pinaghiwalay ng kuwit)', 'Etiquetas (separadas por coma)'],
    uploadBtn:       ['업로드', 'Upload', 'アップロード', '上传', '上傳', 'อัปโหลด', 'Unggah', 'Tải lên', 'I-upload', 'Subir'],
    selectVideoFile: ['영상 파일 선택', 'Select video file', '動画ファイルを選択', '选择视频文件', '選擇影片文件', 'เลือกไฟล์วิดีโอ', 'Pilih file video', 'Chọn tệp video', 'Pumili ng file ng video', 'Seleccionar archivo de video'],
    firstVideo:      ['첫 영상을 올리고 기획사에 노출되어 보세요', 'Upload your first video to get discovered', '最初の動画をアップして事務所に発見されよう', '上传你的第一个视频让经纪公司发现你', '上傳你的第一個影片讓經紀公司發現你', 'อัปโหลดวิดีโอแรกของคุณเพื่อให้ถูกค้นพบ', 'Upload video pertamamu untuk ditemukan', 'Tải video đầu tiên để được phát hiện', 'Mag-upload ng iyong unang video para matuklasan', 'Sube tu primer video para ser descubierto'],
    views:           ['조회', 'views', '再生', '次播放', '次播放', 'ครั้ง', 'tayangan', 'lượt xem', 'views', 'vistas'],
    likes:           ['좋아요', 'Likes', 'いいね', '点赞', '讚', 'ถูกใจ', 'Suka', 'Thích', 'Gusto', 'Me gusta'],
    agencyInterest:  ['기획사 관심', 'Agency interest', '事務所の関心', '经纪公司关注', '經紀公司關注', 'ความสนใจจากค่ายเพลง', 'Minat agensi', 'Sự quan tâm của công ty', 'Interes ng ahensya', 'Interés de agencia'],
    statusActive:    ['공개', 'Public', '公開', '已发布', '已發布', 'เผยแพร่', 'Publik', 'Công khai', 'Pampubliko', 'Público'],
    statusReview:    ['검토중', 'Under review', '審査中', '审核中', '審核中', 'อยู่ระหว่างการตรวจสอบ', 'Sedang ditinjau', 'Đang xem xét', 'Sinusuri', 'En revisión'],
    deleteVideo:     ['영상 삭제', 'Delete video', '動画を削除', '删除视频', '刪除影片', 'ลบวิดีโอ', 'Hapus video', 'Xóa video', 'I-delete ang video', 'Eliminar video'],
    deleteConfirm:   ['영상을 삭제할까요?', 'Delete this video?', 'この動画を削除しますか？', '删除此视频？', '刪除此影片？', 'ลบวิดีโอนี้?', 'Hapus video ini?', 'Xóa video này?', 'I-delete ang video na ito?', '¿Eliminar este video?'],
    videoLoading:    ['영상 준비 중...', 'Video loading...', '動画を読み込み中...', '视频加载中...', '影片載入中...', 'กำลังโหลดวิดีโอ...', 'Memuat video...', 'Đang tải video...', 'Naglo-load ang video...', 'Cargando video...'],
  },

  // ── Auditions ────────────────────────────────────────
  auditions: {
    title:           ['오디션 공고', 'Auditions', 'オーディション', '试镜公告', '試鏡公告', 'ออดิชัน', 'Audisi', 'Thử vai', 'Mga Audisyon', 'Audiciones'],
    noAuditions:     ['현재 열린 오디션이 없어요', 'No open auditions', '開催中のオーディションはありません', '目前没有试镜', '目前沒有試鏡', 'ไม่มีออดิชันที่เปิดรับ', 'Tidak ada audisi terbuka', 'Không có buổi thử vai', 'Walang bukas na audisyon', 'No hay audiciones abiertas'],
    deadline:        ['마감', 'Deadline', '締切', '截止', '截止', 'วันหมดอายุ', 'Batas', 'Hạn chót', 'Deadline', 'Fecha límite'],
    expired:         ['마감됨', 'Expired', '締切済み', '已截止', '已截止', 'หมดอายุแล้ว', 'Kadaluarsa', 'Đã hết hạn', 'Expired na', 'Expirado'],
    apply:           ['지원하기', 'Apply', '応募する', '立即申请', '立即申請', 'สมัคร', 'Lamar', 'Ứng tuyển', 'Mag-apply', 'Aplicar'],
    applied:         ['지원완료', 'Applied', '応募済み', '已申请', '已申請', 'สมัครแล้ว', 'Sudah melamar', 'Đã ứng tuyển', 'Nag-apply na', 'Ya aplicado'],
    categories:      ['분야', 'Category', '分野', '领域', '領域', 'สาขา', 'Bidang', 'Lĩnh vực', 'Larangan', 'Campo'],
    agencyLabel:     ['기획사', 'Agency', '事務所', '经纪公司', '經紀公司', 'ค่ายเพลง', 'Agensi', 'Công ty', 'Ahensya', 'Agencia'],
    viewDetails:     ['자세히 보기', 'View details', '詳細を見る', '查看详情', '查看詳情', 'ดูรายละเอียด', 'Lihat detail', 'Xem chi tiết', 'Tingnan ang detalye', 'Ver detalles'],
    pageDesc:        ['기획사의 오디션에 맞춤 영상으로 지원해보세요', 'Apply with your video to agency auditions', 'エージェンシーのオーディションに応募しよう', '用视频申请经纪公司试镜', '用影片申請經紀公司試鏡', 'สมัครออดิชันด้วยวิดีโอของคุณ', 'Lamar audisi agensi dengan videomu', 'Ứng tuyển thử vai với video của bạn', 'Mag-apply sa audisyon ng ahensya gamit ang iyong video', 'Aplica a las audiciones con tu video'],
    review:          ['검토중', 'Under review', '審査中', '审核中', '審核中', 'อยู่ระหว่างการตรวจสอบ', 'Sedang ditinjau', 'Đang xem xét', 'Sinusuri', 'En revisión'],
    skipped:         ['패스됨', 'Passed', 'パス', '未通过', '未通過', 'ผ่าน', 'Dilewati', 'Đã bỏ qua', 'Naipasa', 'Pasado'],
    cancelApplication: ['지원 취소', 'Cancel application', '応募取消', '取消申请', '取消申請', 'ยกเลิกใบสมัคร', 'Batalkan lamaran', 'Hủy ứng tuyển', 'Kanselahin ang aplikasyon', 'Cancelar solicitud'],
    expiredPost:     ['마감된 공고', 'Expired post', '締切済み公告', '已截止公告', '已截止公告', 'ประกาศที่หมดอายุ', 'Pengumuman kadaluarsa', 'Thông báo đã hết hạn', 'Expired na post', 'Publicación expirada'],
    existingVideo:   ['기존 영상 선택', 'Select existing video', '既存の動画を選択', '选择已有视频', '選擇已有影片', 'เลือกวิดีโอที่มีอยู่', 'Pilih video yang ada', 'Chọn video hiện có', 'Pumili ng kasalukuyang video', 'Seleccionar video existente'],
    newVideoTab:     ['새 영상 업로드', 'Upload new video', '新しい動画をアップ', '上传新视频', '上傳新影片', 'อัปโหลดวิดีโอใหม่', 'Upload video baru', 'Tải lên video mới', 'Mag-upload ng bagong video', 'Subir nuevo video'],
    noVideosYet:     ['업로드된 영상이 없어요', 'No uploaded videos', 'アップロードした動画がありません', '还没有上传的视频', '還沒有上傳的影片', 'ยังไม่มีวิดีโอที่อัปโหลด', 'Belum ada video yang diunggah', 'Chưa có video nào được tải lên', 'Wala pang na-upload na video', 'No hay videos subidos'],
    submittedVideo:  ['제출한 영상', 'Submitted video', '提出した動画', '提交的视频', '提交的影片', 'วิดีโอที่ส่งแล้ว', 'Video yang dikirim', 'Video đã gửi', 'Na-submit na video', 'Video enviado'],
    messagePlaceholder: ['한마디 (선택사항) — 지원 동기, 강점 등', 'A message (optional) — motivation, strengths…', 'ひとこと（任意）— 志望動機、強みなど', '留言（可选）', '留言（可選）', 'ข้อความ (ไม่จำเป็น)', 'Pesan (opsional)', 'Tin nhắn (tùy chọn)', 'Mensahe (opsyonal)', 'Mensaje (opcional)'],
    submitting:      ['지원 중...', 'Submitting...', '応募中...', '申请中...', '申請中...', 'กำลังส่ง...', 'Sedang melamar...', 'Đang gửi...', 'Nag-a-submit...', 'Enviando...'],
    checkChat:       ['채팅 확인하기 →', 'Check chat →', 'チャットを確認 →', '查看聊天 →', '查看聊天 →', 'ดูแชท →', 'Cek chat →', 'Xem chat →', 'Tingnan ang chat →', 'Ver chat →'],
    selectVideoError:['영상을 선택해주세요', 'Please select a video', '動画を選択してください', '请选择视频', '請選擇影片', 'โปรดเลือกวิดีโอ', 'Silakan pilih video', 'Vui lòng chọn video', 'Mangyaring pumili ng video', 'Por favor selecciona un video'],
  },

  // ── Reactions / Activity ─────────────────────────────
  reactions: {
    title:           ['반응', 'Activity', '通知', '动态', '動態', 'กิจกรรม', 'Aktivitas', 'Hoạt động', 'Aktibidad', 'Actividad'],
    noReactions:     ['아직 반응이 없어요', 'No activity yet', 'まだ反応はありません', '还没有动态', '還沒有動態', 'ยังไม่มีกิจกรรม', 'Belum ada aktivitas', 'Chưa có hoạt động', 'Wala pang aktibidad', 'Sin actividad aún'],
    reactionsDesc:   ['영상을 올리면 기획사가 반응을 남길 수 있어요', 'Upload videos so agencies can react', '動画をアップすると事務所がリアクションできます', '上传视频后经纪公司可以做出反应', '上傳影片後經紀公司可以做出反應', 'อัปโหลดวิดีโอเพื่อให้ค่ายเพลงแสดงปฏิกิริยา', 'Upload video agar agensi bisa bereaksi', 'Tải video lên để các công ty có thể phản ứng', 'Mag-upload ng video para makapag-react ang mga ahensya', 'Sube videos para que las agencias puedan reaccionar'],
    bookmarked:      ['회원님의 영상에 관심을 보였어요', 'showed interest in your video', 'があなたの動画に関心を示しました', '对你的视频感兴趣', '對你的影片感興趣', 'แสดงความสนใจในวิดีโอของคุณ', 'menunjukkan minat pada videomu', 'đã quan tâm đến video của bạn', 'nagpakita ng interes sa iyong video', 'mostró interés en tu video'],
    pageTitle:       ['기획사 반응', 'Agency Reactions', 'エージェンシーの反応', '经纪公司反应', '經紀公司反應', 'การตอบสนองของค่ายเพลง', 'Reaksi Agensi', 'Phản ứng từ công ty', 'Reaksyon ng Ahensya', 'Reacciones de agencias'],
    pageDesc:        ['내 영상에 관심을 보인 기획사들', 'Agencies interested in your videos', '動画に関心を示した事務所', '对你视频感兴趣的经纪公司', '對你影片感興趣的經紀公司', 'ค่ายเพลงที่สนใจวิดีโอของคุณ', 'Agensi yang tertarik dengan videomu', 'Các công ty quan tâm video của bạn', 'Mga ahensyang interesado sa iyong video', 'Agencias interesadas en tus videos'],
    noChats:         ['아직 대화가 없어요', 'No conversations yet', 'まだ会話はありません', '还没有对话', '還沒有對話', 'ยังไม่มีการสนทนา', 'Belum ada percakapan', 'Chưa có cuộc trò chuyện', 'Wala pang pag-uusap', 'Sin conversaciones aún'],
    noChatsDesc:     ['영상을 올리면 기획사에서 채팅이 올 수 있어요', 'Upload videos to be contacted by agencies', '動画をアップすると事務所から連絡が来るかも', '上传视频后经纪公司可能会联系你', '上傳影片後經紀公司可能會聯絡你', 'อัปโหลดวิดีโอเพื่อให้ค่ายเพลงติดต่อคุณ', 'Upload video agar agensi menghubungimu', 'Tải video lên để được các công ty liên hệ', 'Mag-upload ng video para makipag-ugnayan ang mga ahensya', 'Sube videos para que las agencias te contacten'],
    noBookmarksYet:  ['아직 관심 표시가 없어요', 'No interest shown yet', 'まだ関心表示はありません', '还没有收到关注', '還沒有收到關注', 'ยังไม่มีการแสดงความสนใจ', 'Belum ada minat ditunjukkan', 'Chưa có sự quan tâm nào', 'Wala pang interes na ipinakita', 'Aún no hay interés mostrado'],
    newInterestToast:['새로운 관심 표시가 왔어요!', 'New interest received!', '新しい関心表示が届きました！', '收到新的关注！', '收到新的關注！', 'ได้รับความสนใจใหม่!', 'Minat baru diterima!', 'Có sự quan tâm mới!', 'May bagong interes na natanggap!', '¡Nuevo interés recibido!'],
    agencyChatToast: ['기획사에서 채팅을 시작했어요!', 'An agency started a chat!', '事務所からチャットが届きました！', '经纪公司开始了对话！', '經紀公司開始了對話！', 'ค่ายเพลงเริ่มแชทแล้ว!', 'Agensi memulai chat!', 'Công ty đã bắt đầu chat!', 'Nagsimulang mag-chat ang isang ahensya!', '¡Una agencia inició un chat!'],
    deleteConfirm:   ['내 채팅 목록에서 삭제할까요?', 'Remove from your chat list?', 'チャットリストから削除しますか？', '从聊天列表中删除？', '從聊天列表中刪除？', 'ลบออกจากรายการแชทของคุณ?', 'Hapus dari daftar chat?', 'Xóa khỏi danh sách chat?', 'Alisin sa listahan ng chat?', '¿Eliminar de tu lista de chats?'],
    startChat:       ['대화를 시작해보세요', 'Start a conversation', '会話を始めましょう', '开始对话吧', '開始對話吧', 'เริ่มบทสนทนา', 'Mulai percakapan', 'Bắt đầu cuộc trò chuyện', 'Magsimula ng pag-uusap', 'Inicia una conversación'],
  },

  // ── Explore ──────────────────────────────────────────
  explore: {
    title:           ['탐색', 'Explore', '探索', '探索', '探索', 'สำรวจ', 'Jelajahi', 'Khám phá', 'I-explore', 'Explorar'],
    allCategories:   ['전체', 'All', 'すべて', '全部', '全部', 'ทั้งหมด', 'Semua', 'Tất cả', 'Lahat', 'Todo'],
    noVideos:        ['아직 영상이 없어요', 'No videos yet', 'まだ動画がありません', '还没有视频', '還沒有影片', 'ยังไม่มีวิดีโอ', 'Belum ada video', 'Chưa có video', 'Wala pang video', 'Sin videos aún'],
    sortLatest:      ['최신순', 'Latest', '最新順', '最新', '最新', 'ล่าสุด', 'Terbaru', 'Mới nhất', 'Pinakabago', 'Recientes'],
    sortLikes:       ['좋아요순', 'Most liked', '人気順', '最多点赞', '最多讚', 'ยอดนิยม', 'Terpopuler', 'Nhiều thích nhất', 'Pinakamaraming gusto', 'Más gustados'],
  },

  // ── Profile ──────────────────────────────────────────
  profile: {
    editProfile:     ['프로필 편집', 'Edit Profile', 'プロフィール編集', '编辑资料', '編輯資料', 'แก้ไขโปรไฟล์', 'Edit profil', 'Chỉnh sửa hồ sơ', 'I-edit ang profile', 'Editar perfil'],
    namePlaceholder: ['이름', 'Name', '名前', '姓名', '姓名', 'ชื่อ', 'Nama', 'Tên', 'Pangalan', 'Nombre'],
    bioPlaceholder:  ['자기소개', 'Bio', '自己紹介', '个人简介', '個人簡介', 'แนะนำตัว', 'Bio', 'Tiểu sử', 'Bio', 'Biografía'],
    changePhoto:     ['사진 변경', 'Change photo', '写真を変更', '更换照片', '更換照片', 'เปลี่ยนรูป', 'Ganti foto', 'Đổi ảnh', 'Palitan ang larawan', 'Cambiar foto'],
    saved:           ['저장됐어요!', 'Saved!', '保存しました！', '已保存！', '已儲存！', 'บันทึกแล้ว!', 'Tersimpan!', 'Đã lưu!', 'Nai-save na!', '¡Guardado!'],
    logout:          ['로그아웃', 'Log out', 'ログアウト', '退出登录', '退出登入', 'ออกจากระบบ', 'Keluar', 'Đăng xuất', 'Mag-logout', 'Cerrar sesión'],
    myProfile:       ['내 프로필', 'My Profile', 'マイプロフィール', '我的资料', '我的資料', 'โปรไฟล์ของฉัน', 'Profil saya', 'Hồ sơ của tôi', 'Aking profile', 'Mi perfil'],
    basicInfo:       ['기본 정보', 'Basic Info', '基本情報', '基本信息', '基本資訊', 'ข้อมูลพื้นฐาน', 'Info dasar', 'Thông tin cơ bản', 'Basic na impormasyon', 'Información básica'],
    bodyInfo:        ['신체 정보', 'Physical Info', '身体情報', '身体信息', '身體資訊', 'ข้อมูลร่างกาย', 'Info fisik', 'Thông tin thể chất', 'Pisikal na impormasyon', 'Información física'],
    skillsLabel:     ['특기', 'Skills', 'スキル', '特长', '特長', 'ทักษะ', 'Keahlian', 'Kỹ năng', 'Mga kasanayan', 'Habilidades'],
    aboutMe:         ['자기소개', 'About me', '自己紹介', '自我介绍', '自我介紹', 'เกี่ยวกับฉัน', 'Tentang saya', 'Về tôi', 'Tungkol sa akin', 'Sobre mí'],
    nameRequired:    ['이름 *', 'Name *', '名前 *', '姓名 *', '姓名 *', 'ชื่อ *', 'Nama *', 'Tên *', 'Pangalan *', 'Nombre *'],
    birthDate:       ['생년월일', 'Date of birth', '生年月日', '出生日期', '出生日期', 'วันเกิด', 'Tanggal lahir', 'Ngày sinh', 'Petsa ng kapanganakan', 'Fecha de nacimiento'],
    selectGender:    ['성별 선택', 'Select gender', '性別を選択', '选择性别', '選擇性別', 'เลือกเพศ', 'Pilih jenis kelamin', 'Chọn giới tính', 'Pumili ng kasarian', 'Seleccionar género'],
    genderMale:      ['남성', 'Male', '男性', '男', '男', 'ชาย', 'Laki-laki', 'Nam', 'Lalaki', 'Masculino'],
    genderFemale:    ['여성', 'Female', '女性', '女', '女', 'หญิง', 'Perempuan', 'Nữ', 'Babae', 'Femenino'],
    genderOther:     ['기타', 'Other', 'その他', '其他', '其他', 'อื่นๆ', 'Lainnya', 'Khác', 'Iba pa', 'Otro'],
    heightPlaceholder: ['키 (cm)', 'Height (cm)', '身長 (cm)', '身高 (cm)', '身高 (cm)', 'ส่วนสูง (cm)', 'Tinggi (cm)', 'Chiều cao (cm)', 'Taas (cm)', 'Altura (cm)'],
    weightPlaceholder: ['몸무게 (kg)', 'Weight (kg)', '体重 (kg)', '体重 (kg)', '體重 (kg)', 'น้ำหนัก (kg)', 'Berat (kg)', 'Cân nặng (kg)', 'Timbang (kg)', 'Peso (kg)'],
    bioPlaceholderLong: ['기획사 담당자에게 나를 소개해보세요', 'Introduce yourself to agencies', '事務所の担当者に自己紹介してください', '向经纪公司介绍自己', '向經紀公司介紹自己', 'แนะนำตัวเองให้ค่ายเพลงรู้จัก', 'Perkenalkan dirimu ke agensi', 'Giới thiệu bản thân với các công ty', 'Ipakilala ang iyong sarili sa mga ahensya', 'Preséntate a las agencias'],
    saving:          ['저장 중...', 'Saving...', '保存中...', '保存中...', '儲存中...', 'กำลังบันทึก...', 'Menyimpan...', 'Đang lưu...', 'Nag-i-save...', 'Guardando...'],
    saveDone:        ['✓ 저장완료', '✓ Saved', '✓ 保存完了', '✓ 已保存', '✓ 已儲存', '✓ บันทึกแล้ว', '✓ Tersimpan', '✓ Đã lưu', '✓ Nai-save', '✓ Guardado'],
    saveBtn:         ['저장', 'Save', '保存', '保存', '儲存', 'บันทึก', 'Simpan', 'Lưu', 'I-save', 'Guardar'],
    avatarUploading: ['업로드 중...', 'Uploading...', 'アップロード中...', '上传中...', '上傳中...', 'กำลังอัปโหลด...', 'Mengunggah...', 'Đang tải lên...', 'Nag-a-upload...', 'Subiendo...'],
    selectNationality: ['국적 선택', 'Select nationality', '国籍を選択', '选择国籍', '選擇國籍', 'เลือกสัญชาติ', 'Pilih kewarganegaraan', 'Chọn quốc tịch', 'Pumili ng nasyonalidad', 'Seleccionar nacionalidad'],
    skillVocal:        ['보컬', 'Vocal', 'ボーカル', '声乐', '聲樂', 'ร้องเพลง', 'Vokal', 'Giọng hát', 'Vocal', 'Vocal'],
    skillDance:        ['댄스', 'Dance', 'ダンス', '舞蹈', '舞蹈', 'เต้น', 'Tari', 'Nhảy', 'Sayaw', 'Baile'],
    skillRap:          ['랩', 'Rap', 'ラップ', '说唱', '說唱', 'แร็พ', 'Rap', 'Rap', 'Rap', 'Rap'],
    skillActing:       ['연기', 'Acting', '演技', '表演', '表演', 'การแสดง', 'Akting', 'Diễn xuất', 'Pag-arte', 'Actuación'],
    skillLyrics:       ['작사', 'Lyricist', '作詞', '作词', '作詞', 'เขียนเนื้อเพลง', 'Penulis lirik', 'Viết lời nhạc', 'Manunulat ng lyrics', 'Letrista'],
    skillCompose:      ['작곡', 'Composer', '作曲', '作曲', '作曲', 'แต่งเพลง', 'Komposer', 'Sáng tác', 'Kompositor', 'Compositor'],
    skillInstrument:   ['악기', 'Instrument', '楽器', '乐器', '樂器', 'เครื่องดนตรี', 'Instrumen', 'Nhạc cụ', 'Instrumento', 'Instrumento'],
    skillPerformance:  ['퍼포먼스', 'Performance', 'パフォーマンス', '表演', '表演', 'การแสดง', 'Pertunjukan', 'Biểu diễn', 'Pagtatanghal', 'Actuación'],
  },

  // ── Settings / Language ──────────────────────────────
  settings: {
    language:        ['언어', 'Language', '言語', '语言', '語言', 'ภาษา', 'Bahasa', 'Ngôn ngữ', 'Wika', 'Idioma'],
    chooseLanguage:  ['언어 선택', 'Choose language', '言語を選択', '选择语言', '選擇語言', 'เลือกภาษา', 'Pilih bahasa', 'Chọn ngôn ngữ', 'Pumili ng wika', 'Seleccionar idioma'],
  },
}

export type TranslationKey = keyof typeof t

function get(arr: string[], lang: Lang): string {
  return arr[LANGS.indexOf(lang)] ?? arr[0]
}

export function useT(lang: Lang) {
  return {
    nav: Object.fromEntries(Object.entries(t.nav).map(([k, v]) => [k, get(v, lang)])) as Record<keyof typeof t.nav, string>,
    common: Object.fromEntries(Object.entries(t.common).map(([k, v]) => [k, get(v, lang)])) as Record<keyof typeof t.common, string>,
    auth: Object.fromEntries(Object.entries(t.auth).map(([k, v]) => [k, get(v, lang)])) as Record<keyof typeof t.auth, string>,
    dashboard: Object.fromEntries(Object.entries(t.dashboard).map(([k, v]) => [k, get(v, lang)])) as Record<keyof typeof t.dashboard, string>,
    videos: Object.fromEntries(Object.entries(t.videos).map(([k, v]) => [k, get(v, lang)])) as Record<keyof typeof t.videos, string>,
    auditions: Object.fromEntries(Object.entries(t.auditions).map(([k, v]) => [k, get(v, lang)])) as Record<keyof typeof t.auditions, string>,
    reactions: Object.fromEntries(Object.entries(t.reactions).map(([k, v]) => [k, get(v, lang)])) as Record<keyof typeof t.reactions, string>,
    explore: Object.fromEntries(Object.entries(t.explore).map(([k, v]) => [k, get(v, lang)])) as Record<keyof typeof t.explore, string>,
    profile: Object.fromEntries(Object.entries(t.profile).map(([k, v]) => [k, get(v, lang)])) as Record<keyof typeof t.profile, string>,
    settings: Object.fromEntries(Object.entries(t.settings).map(([k, v]) => [k, get(v, lang)])) as Record<keyof typeof t.settings, string>,
  }
}
