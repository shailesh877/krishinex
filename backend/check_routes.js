const r = require('./routes/kspRoutes'); 
console.log('Routes count:', r.stack.length);
r.stack.forEach(layer => {
  if (layer.route) {
    console.log(layer.route.methods, layer.route.path);
  }
});
