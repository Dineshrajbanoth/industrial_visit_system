const express = require('express');
const { adminRegister, adminLogin, studentLogin, login, studentRegister } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.post('/admin-login', adminLogin);
router.post('/admin/register', adminRegister);
router.post('/admin/login', adminLogin);
router.post('/student-login', studentLogin);
router.post('/student-register', studentRegister);

module.exports = router;
