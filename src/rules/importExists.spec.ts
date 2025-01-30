import { RuleTester } from '@typescript-eslint/rule-tester';

import { importExists } from './importExists';

const ruleTester = new RuleTester({
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
});

ruleTester.run('eslint-plugin/import-exists', importExists, {
  valid: [
    {
      code: `import { LoadingPlaceholder } from '@grafana/ui';`,
      // code: `import { getBackendSrv, isFetchError } from '@grafana/runtime';`,
    },
  ],
  invalid: [
    {
      code: `import { createDataFrame } from '@grafana/data';`,
      errors: [
        {
          messageId: 'issue:import',
        },
      ],
    },
  ],
});
