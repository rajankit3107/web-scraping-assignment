import fs from 'fs';
import path from 'path';

const STATE_FILE = path.join('./data', 'state.json');

export const loadState = (): Record<string, number> => {
   try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
   } catch {
      return {};
   }
};

export const saveState = (state: Record<string, number>) => {
   fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
   fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
};
