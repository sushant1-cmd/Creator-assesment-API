const express = require('express');

const feedController = require('../controllers/eval');

const router = express.Router();

// GET /eval/questions
router.get('/questions', feedController.getQuestions);

// POST /eval/post
router.post('/post', feedController.postResult);

module.exports = router;