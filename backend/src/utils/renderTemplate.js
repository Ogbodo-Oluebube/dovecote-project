// Turns "Hi {{name}}, your code is {{code}}" into "Hi Ada, your code is 1234".
// A placeholder with no matching variable is left as written, so a typo is
// visible rather than silently erased.
export const renderTemplate = (text = "", vars = {}) =>
  text.replace(/{{\s*(\w+)\s*}}/g, (_, key) => (vars[key] !== undefined ? vars[key] : `{{${key}}}`));
