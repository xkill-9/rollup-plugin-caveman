const test = require('ava');
const rollup = require('rollup');
const caveman = require('..').default;

const getCode = async (bundle) => {
  const { output } = await bundle.generate({ format: 'cjs', exports: 'auto' });
  const [{ code }] = output;
  return code;
};

test('converts template to es6 module', async (t) => {
  const bundle = await rollup.rollup({
    input: 'test/fixtures/basic-example/input.js',
    plugins: [caveman()],
  });

  t.snapshot(await getCode(bundle));
});
