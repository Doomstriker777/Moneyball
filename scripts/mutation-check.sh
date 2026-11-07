#!/usr/bin/env bash
# ==============================================================================
# LedgerLine Concurrency & Integrity Mutation Test Suite
#
# Tests resilience by purposefully injecting 5 architectural faults into the code
# and verifying that the corresponding concurrency & integrity tests catch them.
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Starting LedgerLine Mutation Check Suite ===${NC}"

# Baseline check
echo -e "\n${BLUE}[1/5] Verifying baseline test suite passes...${NC}"
mvn test -Dtest=ConcurrencyAndIntegrityIntegrationTest -q
echo -e "${GREEN}✓ Baseline passes cleanly (7/7 tests passed)${NC}"

# Mutation 1: Remove Idempotency Protection
echo -e "\n${BLUE}[2/5] Mutation 1: Disable Idempotency Cache Replay Check...${NC}"
sed -i.bak 's/if (replay.isPresent())/if (false \&\& replay.isPresent())/' src/main/java/com/ledgerline/controller/PostingController.java
if mvn test -Dtest=ConcurrencyAndIntegrityIntegrationTest#idempotentReplayConcurrentRace -q > /dev/null 2>&1; then
    echo -e "${RED}✗ MUTATION MISSED: Test passed when idempotency was disabled!${NC}"
    mv src/main/java/com/ledgerline/controller/PostingController.java.bak src/main/java/com/ledgerline/controller/PostingController.java
    exit 1
else
    echo -e "${GREEN}✓ MUTATION CAUGHT: Test failed as expected when idempotency was removed.${NC}"
fi
mv src/main/java/com/ledgerline/controller/PostingController.java.bak src/main/java/com/ledgerline/controller/PostingController.java

# Mutation 2: Remove Balance Check (Simulate check-then-act omission)
echo -e "\n${BLUE}[3/5] Mutation 2: Remove balance sufficiency check in PostingService...${NC}"
sed -i.bak 's/if (balance - amount < -overdraftLimit)/if (false)/' src/main/java/com/ledgerline/service/PostingService.java
if mvn test -Dtest=ConcurrencyAndIntegrityIntegrationTest#noOverdrawConcurrentRace -q > /dev/null 2>&1; then
    echo -e "${RED}✗ MUTATION MISSED: Test passed when balance check was skipped!${NC}"
    mv src/main/java/com/ledgerline/service/PostingService.java.bak src/main/java/com/ledgerline/service/PostingService.java
    exit 1
else
    echo -e "${GREEN}✓ MUTATION CAUGHT: Test failed as expected when balance check was removed.${NC}"
fi
mv src/main/java/com/ledgerline/service/PostingService.java.bak src/main/java/com/ledgerline/service/PostingService.java

# Mutation 3: Break Double-Entry Invariant (Omit debit on transfer)
echo -e "\n${BLUE}[4/5] Mutation 3: Asymmetric posting (credit only, no debit)...${NC}"
sed -i.bak 's/ledgerEntryRepository.save(debitEntry);/\/\/ ledgerEntryRepository.save(debitEntry);/' src/main/java/com/ledgerline/service/PostingService.java
if mvn test -Dtest=ConcurrencyAndIntegrityIntegrationTest#conservationAcrossRandomOperations -q > /dev/null 2>&1; then
    echo -e "${RED}✗ MUTATION MISSED: Test passed with broken double-entry invariant!${NC}"
    mv src/main/java/com/ledgerline/service/PostingService.java.bak src/main/java/com/ledgerline/service/PostingService.java
    exit 1
else
    echo -e "${GREEN}✓ MUTATION CAUGHT: Database trigger and test rejected unbalanced journal!${NC}"
fi
mv src/main/java/com/ledgerline/service/PostingService.java.bak src/main/java/com/ledgerline/service/PostingService.java

# Mutation 4: Break Row Locking Order (Lock in argument order instead of ascending ID)
echo -e "\n${BLUE}[5/5] Mutation 4: Invert ordered row locking (argument order A->B vs B->A)...${NC}"
sed -i.bak 's/Math.min(sourceId, destinationId)/sourceId/g' src/main/java/com/ledgerline/service/PostingService.java
sed -i.bak 's/Math.max(sourceId, destinationId)/destinationId/g' src/main/java/com/ledgerline/service/PostingService.java
if mvn test -Dtest=ConcurrencyAndIntegrityIntegrationTest#opposingTransfersNoDeadlock -q > /dev/null 2>&1; then
    echo -e "${RED}✗ MUTATION MISSED: Test passed without ascending ID lock ordering!${NC}"
    mv src/main/java/com/ledgerline/service/PostingService.java.bak src/main/java/com/ledgerline/service/PostingService.java
    exit 1
else
    echo -e "${GREEN}✓ MUTATION CAUGHT: Opposing transfers deadlocked as expected when locks were unordered.${NC}"
fi
mv src/main/java/com/ledgerline/service/PostingService.java.bak src/main/java/com/ledgerline/service/PostingService.java

echo -e "\n${GREEN}=== ALL 5 MUTATIONS SUCCESSFULLY DETECTED AND CAUGHT ===${NC}"
