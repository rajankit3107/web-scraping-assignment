import fs from 'fs';

const STATE_FILE = './data/state.json';

export const saveState = (state: Record<string, number>): void => {
   fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
};

export const loadState = (): Record<string, number> => {
   if (!fs.existsSync(STATE_FILE)) return {};
   return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
};
