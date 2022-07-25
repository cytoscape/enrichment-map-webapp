let expressServer;

before(async function() {
  this.timeout(15000);

  process.env.MONGO_ROOT_NAME = 'enrichment-map-test';
  console.log("using DB: " + process.env.MONGO_ROOT_NAME);

  // Need to initialize express only once for the entire test suite.
  // This also initializes the mongo connection and loads the geneset DB.
  console.log("starting express server");
  const { server } = await import('../src/server/index.js');
  expressServer = server;
});


after(async function() {
  await expressServer.close();
  console.log("stopped express server");
});