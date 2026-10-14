import assert from "node:assert/strict";
import { ComQuoteStatus } from "@prisma/client";
import {
  canTransitionQuoteStatus,
  permissionForQuoteStatus,
} from "./quote-transitions";

assert.equal(
  canTransitionQuoteStatus(ComQuoteStatus.BROUILLON, ComQuoteStatus.ENVOYE),
  true,
);
assert.equal(
  canTransitionQuoteStatus(ComQuoteStatus.BROUILLON, ComQuoteStatus.ACCEPTE),
  false,
);
assert.equal(
  canTransitionQuoteStatus(ComQuoteStatus.ENVOYE, ComQuoteStatus.ACCEPTE),
  true,
);
assert.equal(
  canTransitionQuoteStatus(ComQuoteStatus.REFUSE, ComQuoteStatus.ENVOYE),
  false,
);
assert.equal(
  canTransitionQuoteStatus(ComQuoteStatus.ENVOYE, ComQuoteStatus.ENVOYE),
  true,
);

assert.equal(permissionForQuoteStatus(ComQuoteStatus.ENVOYE), "com.devis.send");
assert.equal(
  permissionForQuoteStatus(ComQuoteStatus.ACCEPTE),
  "com.devis.accept_reject",
);
assert.equal(
  permissionForQuoteStatus(ComQuoteStatus.BROUILLON),
  "com.devis.edit_own",
);

console.log("quote-transitions.test.ts OK");
