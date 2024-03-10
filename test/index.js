const test = require('ava');
const { resolve } = require('path');
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

test('supports partials', async (t) => {
  const bundle = await rollup.rollup({
    input: 'test/fixtures/partial-examples/basic/input.js',
    plugins: [caveman()],
  });

  t.snapshot(await getCode(bundle));
});

test('supports external partials', async (t) => {
  const bundle = await rollup.rollup({
    input: 'test/fixtures/partial-examples/basic/with-external-partial.js',
    plugins: [
      caveman({
        partialPaths: [resolve('test/fixtures/partial-examples/external/')],
      }),
    ],
  });

  t.snapshot(await getCode(bundle));
});
