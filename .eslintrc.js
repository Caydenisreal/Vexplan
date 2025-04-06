module.exports = {
  extends: ["next/core-web-vitals"],
  settings: {
    // Add settings to help ESLint resolve imports
    "import/resolver": {
      node: {
        extensions: [".js", ".jsx", ".ts", ".tsx"]
      }
    }
  },
  rules: {
    // Disable the rule that's causing issues with @radix-ui packages
    "import/no-unresolved": "off"
  }
};
