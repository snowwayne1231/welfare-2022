const models = require('./models');
const md5 = require('md5');
const path = require('path');
const fs =require('fs');
const sequelize = require('sequelize');
const enums = require('../src/enum');

// render and handle the uri
var _index = path.join(__dirname, '..', 'dist', 's.ejs');
if (!fs.existsSync(_index)) {
    _index = path.join(__dirname, '..', 's.ejs');
}
const _login = path.join(__dirname, 'login.ejs');


module.exports = {
    renderIndex: function(res) {
        return res.render(_index);
    },
    renderLogin: function(res, objects = {}) {
        const template = {msg: '', register: false};
        return res.render(_login, {...template, ...objects});
    },
    logoutByRequestResponse: function(req, res) {
        req.session = null;
        res.clearCookie('_se_tls_');
        res.clearCookie('_logintimestamp_');
        return res.redirect('/s');
    },
    asyncLogin: async function(code, pwd, address = '') {
        const loginTimestamp = new Date().getTime();
        const user = await models.User.findOne({
            attributes: ['id', 'nickname', 'pwd', 'code'],
            where: { code: code }
        });

        if (user) {
            const user_data = user.toJSON();
             if (user_data.pwd == '') {
                return {done: false, register: true};
            } else if (user_data.pwd == md5(String(pwd))) {
                // 登錄
                const _record = models.RecordLogin.build({
                    userId: user_data.id,
                    timestamp: new Date(loginTimestamp),
                    ip: address,
                });
                await _record.save();
                return {done: true, msg: '', data: {
                    ...user_data,
                    loginTimestamp,
                }};
            } else {
                // 登錄失敗
                return {done: false, msg: 'Login Failed, Password Wrong.', register: false};
            }
        } else {
            return {done: false, msg: 'Login Failed, Not Exist Code.', register: false};
        }
    },
    asyncRegister: async function(code, pwd, pwdre) {
        const isConfirmed = pwd == pwdre;
        if (isConfirmed) {
            const user = await models.User.findOne({
                attributes: ['id', 'nickname', 'pwd', 'code'],
                where: { code: code }
            });
            if (user) {
                user.pwd = md5(pwd);
                await user.save();
                return {done: true};
            }
            return {done: false, msg: 'Code Not Found.'}
        } else {
            return {done: false, msg: 'Password has difference.', register: true};
        }
    },
    handlePOST: function(req, res, where, ws = null) {
        // const ifLocal = req.headers.host.match(/127.0.0.1/i);
        const _body = req.body;
        switch (where) {
            case 'login': {
                const code = String(_body.code || '').trim();
                const pwd = String(_body.pwd || '').trim();
                const isRegister = _body.pwdre && String(_body.pwdre).length > 0;
                const pwdre = isRegister ? String(_body.pwdre).trim() : '';

                if (isRegister) {
                    return this.asyncRegister(code, pwd, pwdre).then(payload => {
                        if (payload.done) {
                            res.redirect('/s');;
                        } else {
                            res.status(202);
                            this.renderLogin(res, payload);
                        }
                    });
                } else {
                    return this.asyncLogin(code, pwd, req.socket.remoteAddress).then(payload => {
                        if (payload.done) {
                            req.session.userinfo = payload.data;
                            res.cookie('_logintimestamp_', payload.data.loginTimestamp);
                            res.redirect('/s');
                        } else {
                            res.status(203);
                            this.renderLogin(res, payload);
                        }
                    });
                }
            }
            case 'checkweek': {
                const recoverDay = 1;
                const now = new Date();
                console.log('[System][CheckWeek]: ', now.toLocaleString());
                if (now.getDay()==recoverDay) {
                    const self = this;
                    const configs = {round: 0, recover: 0};
                    return models.Config.findAll({attributes: ['name', 'status'], where: {open: true}}).then(cs => {
                        cs.map(c => { if (configs[c.name] >= 0) { configs[c.name] = c.status; } });
                        const gapMinutes = 60*24*5;
                        const nowMinutes = Math.floor(now.getTime() / 60000);
                        if ((nowMinutes - configs.recover) > gapMinutes){
                            self.recoverPoint(ws, configs, nowMinutes).then((updated) => {
                                res.status(200).send(updated ? 'done' : 'nothing');
                            }).catch(err => {
                                res.status(403).send(err);
                            });
                        } else {
                            res.status(201).send('nothing');
                        }
                    });
                } else {
                    return res.status(201).send('Not recover day.');
                }
            }
            default:
                res.status(404).send('Wrong Parameter.');
        }
        return res;
    },
    recoverPoint: async function(ws, configs, nowMinutes) {
        let isNew = configs.recover == 0;
        if (isNew) {
            await models.Config.create({name: 'recover', status: nowMinutes});
        } else {
            await models.Config.update({status: nowMinutes}, {where: {name: 'recover'}});
        }
        // 行動點小於 max 補充到 max
        await models.User.update({actPoint: sequelize.literal('"actPointMax"')}, {where: {actPoint: {[sequelize.Op.lt]: sequelize.literal('"actPointMax"')}}});
        // 更新記憶體 user data
        await ws.refreshMemoDataUsers();
        //
        await models.Config.update({status: configs.round + 1}, {where: {name: 'round'}});
        await ws.initConfig();
        const memo = ws.getMemo();
        if (memo) {
            memo.eventCtl.broadcastInfo(enums.EVENT_SYSTEM_RECOVER, {
                round: configs.round
            })
        }
        return true
    },
    getUserTimes: async function() {
        const userts = await models.UserTime.findAll({where: {utype: enums.TYPE_USERTIME_FREE}});
        return userts;
    },
};