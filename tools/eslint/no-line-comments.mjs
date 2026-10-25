const rule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow // line comments; only JSDoc blocks on exposed APIs are allowed' },
    schema: [],
    messages: { forbidden: 'Line comments are not allowed. Rename or extract code instead.' },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (comment.type === 'Line') {
            context.report({ loc: comment.loc, messageId: 'forbidden' });
          }
        }
      },
    };
  },
};

export default { rules: { 'no-line-comments': rule } };
