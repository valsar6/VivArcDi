import { VivArcDi } from './core/boot/VivArcDi.js';
import { createDefaultRegistry } from './modules/index.js';

void VivArcDi.boot(new URL('./', import.meta.url), createDefaultRegistry());
