const { nowIso } = require('../utils/date.util');

function check(req, res) {
  res.json({
    status: 'ok',
    service: 'Lab1633 Backend',
    timestamp: nowIso(),
  });
}

module.exports = {
  check,
};
