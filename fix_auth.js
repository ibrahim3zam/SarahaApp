const fs = require('fs');

let authPath = 'src/modules/authModule/auth.services.js';
let content = fs.readFileSync(authPath, 'utf8');

// Add imports
if (!content.includes('BadRequestError')) {
  content = content.replace(
    /import { NotFoundError } from '\.\.\/\.\.\/utils\/appError\.js';/g,
    "import { AppError, NotFoundError, BadRequestError, UnauthorizedError } from '../../utils/appError.js';"
  );
}

// Replace next(new Error(...))
content = content.replace(
  /next\(new Error\('([^']+)'\)\)/g,
  "next(new BadRequestError('$1'))"
);

// Replace throw new Error(...)
content = content.replace(
  /throw new Error\('([^']+)'\)/g,
  "throw new BadRequestError('$1')"
);
content = content.replace(
  /throw new Error\(\n\s*'([^']+)'\n\s*\)/g,
  "throw new BadRequestError('$1')"
);

// Replace res.status(xxx).json inside services
content = content.replace(
  /return res\.status\(401\)\.json\(\{\s*message:\s*error\.message\s*\}\);/g,
  'return next(new UnauthorizedError(error.message));'
);
content = content.replace(
  /return res\.status\(400\)\.json\(\{\s*message:\s*'([^']+)'\s*\}\);/g,
  "return next(new BadRequestError('$1'));"
);

fs.writeFileSync(authPath, content);
console.log('Fixed auth.services.js');
