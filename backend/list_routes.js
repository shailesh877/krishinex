const express = require('express');
const router = require('./routes/employeeRoutes');

console.log('--- REGESTERED ROUTES IN employeeRoutes.js ---');
router.stack.forEach(layer => {
  if (layer.route) {
    const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
    console.log(`${methods} ${layer.route.path}`);
  }
});
