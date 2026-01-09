import 'reflect-metadata';

if (!process.env.DEBUG_TESTS) {
  console.log = () => {};
  console.debug = () => {};
}
