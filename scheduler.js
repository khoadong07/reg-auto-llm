function runScript() {
  console.log('Chạy signup_deepinfra.js vào', new Date().toLocaleString());
  try {
    delete require.cache[require.resolve('./signup_deepinfra.js')];
    require('./signup_deepinfra.js');
  } catch (error) {
    console.error('Lỗi khi chạy signup_deepinfra.js:', error);
  }
}

runScript();

// Lặp lại mỗi 3 phút (3 * 60 * 1000 = 180000ms)
setInterval(runScript, 900000);

console.log('Bắt đầu lập lịch, chạy mỗi 15 phút...');