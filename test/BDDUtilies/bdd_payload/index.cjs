const { faker } = require('@faker-js/faker');

function generateUserPayload() {
  return {
    name: faker.string.alphanumeric(15),
    email: `test+${faker.string.alphanumeric(8)}@yourdomain.com`,
    role: 'ADMIN',
    countryCode: '+48',
    phoneNumber: '999999999',
  };
}

module.exports = { generateUserPayload };
