/**
 *  Copyright (c) 2021 GraphQL Contributors
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

import CodeMirror from 'codemirror';
import 'codemirror/addon/lint/lint';
import { readFileSync } from 'fs';
import { join } from 'path';
import { GraphQLError } from 'graphql';
import '../lint';
import '../mode';
import { TestSchema } from './testSchema';

function createEditorWithLint(lintConfig) {
  return CodeMirror(document.createElement('div'), {
    mode: 'graphql',
    lint: lintConfig ? lintConfig : true,
  });
}

function printLintErrors(queryString, configOverrides = {}) {
  const editor = createEditorWithLint({
    schema: TestSchema,
    ...configOverrides,
  });

  return new Promise(resolve => {
    editor.state.lint.options.onUpdateLinting = errors => {
      if (errors && errors[0]) {
        if (!errors[0].message.match('Unexpected EOF')) {
          resolve(errors);
        }
      }
      resolve([]);
    };
    editor.doc.setValue(queryString);
  });
}

describe('graphql-lint', () => {
  it('attaches a GraphQL lint function with correct mode/lint options', () => {
    const editor = createEditorWithLint();
    expect(editor.getHelpers(editor.getCursor(), 'lint')).not.toHaveLength(0);
  });

  const kitchenSink = readFileSync(join(__dirname, '/kitchen-sink.graphql'), {
    encoding: 'utf8',
  });

  it('returns no syntactic/validation errors after parsing kitchen-sink query', async () => {
    const errors = await printLintErrors(kitchenSink);
    expect(errors).toHaveLength(0);
  });

  it('returns a validation error for a invalid query', async () => {
    const noMutationOperationRule = context => ({
      OperationDefinition(node) {
        if (node.operation === 'mutation') {
          context.reportError(new GraphQLError('I like turtles.', node));
        }
        return false;
      },
    });
    const errors = await printLintErrors(kitchenSink, {
      validationRules: [noMutationOperationRule],
    });
    expect(errors.length).toBe(1);
    expect(errors[0].message).toBe('I like turtles.');
  });
});
