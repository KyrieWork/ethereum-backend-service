const route = require('koa-router')();
const controller = require('../../controller/demo/TestController');

route.get('/demo', controller.testAction);

module.exports = route;
