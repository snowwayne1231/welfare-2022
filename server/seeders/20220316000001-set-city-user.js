"use strict";
const db = require('../models');
const citydataset = [
  { id: 3, add: 20, },
  { id: 4, add: 20, },
  { id: 5, add: 20, },
  { id: 6, add: 20, },
  { id: 15, add: 20, },
  { id: 18, add: 20, },
  { id: 22, add: 20, },
  { id: 25, add: 20, },
  { id: 26, add: 20, },
  { id: 31, add: 20, },
  { id: 38, add: 20, },
  { id: 39, add: 20, },
  { id: 41, add: 20, },
  { id: 21, add: 30, },
  { id: 27, add: 30, },
  { id: 40, add: 30, },
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (let i = 0; i < citydataset.length; i++) {
      let loc = citydataset[i];
      await db.City.update({
        addResource: loc.add,
      }, {where: {id: loc.id}});
      await db.City.update({
        jsonConstruction: {
          barrack: {lv: 0, value: 0},
          market: {lv: 0, value: 0},
          stable: {lv: 0, value: 0},
          wall: {lv: 0, value: 0}
        },
      }, {where: {money: 0}});
    }
    
    const users = await db.User.findAll();
    const freemans = [];
    for (let i = 0; i < users.length; i++) {
      let user = users[i];
      if (user.role == 1) {
        user.soldier = 500;
        user.actPoint = 5;
        user.money = 50;
        user.actPointMax = 10;
      } else if (user.role == 2) {
        user.soldier = 200;
        user.actPoint = 3;
        user.money = 0;
        user.actPointMax = 7;
      } else {
        user.soldier = 0;
        user.actPoint = 3;
        user.money = 0;
        user.actPointMax = 3;
        freemans.push(user);
      }
      
      user.pwd = '';
      user.contribution = 0;
      user.occupationId = 0;
      user.destoryByCountryIds = [];
      switch (user.nickname) {
        case '楊薇薇': user.countryId = 7; break
        case '于凱琳': user.countryId = 3; break
        case '趙斯特': user.mapNowId = 38; break
        case '鍾沙亞': user.countryId = 2; break
        case '侯祈': user.countryId = 1; user.mapNowId = 2; break
        case '程寶寶': user.countryId = 0; user.mapNowId = 38; user.role = 3; user.soldier = 0; break
        case '郭杜克': user.countryId = 0; user.actPointMax = 0; break
        case '曾海倫': user.countryId = 0; user.actPointMax = 0; break
        case '歐陽子': user.countryId = 0; user.actPointMax = 0; break
        case '王燁妲': user.countryId = 0; user.actPointMax = 0; break
        default:
      }
      await user.save();
    }

    for(let i = 0; i < freemans.length; i++) {
      let freeuser = freemans[i];
      db.UserTime.create({
        utype: 1,
        userId: freeuser.id,
        before: '',
        after: '{"User": {countryId: 0}}',
        timestamp: new Date('2022-04-01 15:00')
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // await queryInterface.bulkDelete("City", null, {truncate: true, cascade: true, restartIdentity: true});
  }
};

