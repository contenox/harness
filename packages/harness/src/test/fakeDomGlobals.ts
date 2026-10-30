// Import this FIRST in a test file: react-dom decides at import time whether a DOM exists.
import { installFakeDom } from './fakeDom';

installFakeDom();
