CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'PIX', 'OTHERS');

CREATE TABLE "credit_cards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "limit" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "closingDay" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "credit_cards_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "transactions"
ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'OTHERS',
ADD COLUMN "creditCardId" TEXT,
ADD COLUMN "parentTransactionId" TEXT,
ADD COLUMN "isCardStatement" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "statementMonth" INTEGER,
ADD COLUMN "statementYear" INTEGER;

UPDATE "transactions"
SET "category" = 'OTHERS'
WHERE "category"::text = 'CREDIT_CARD';

CREATE TYPE "Category_new" AS ENUM (
    'SALARY',
    'HOUSING',
    'TRANSPORT',
    'FOOD',
    'HEALTH_WELLNESS',
    'LEISURE_ENTERTAINMENT',
    'EDUCATION',
    'FINANCE_INVESTMENTS',
    'OTHERS'
);

ALTER TABLE "transactions"
ALTER COLUMN "category" DROP DEFAULT,
ALTER COLUMN "category" TYPE "Category_new"
USING ("category"::text::"Category_new");

ALTER TABLE "transactions"
ALTER COLUMN "category" SET DEFAULT 'OTHERS';

DROP TYPE "Category";
ALTER TYPE "Category_new" RENAME TO "Category";

CREATE INDEX "credit_cards_userId_idx" ON "credit_cards"("userId");
CREATE INDEX "transactions_creditCardId_idx" ON "transactions"("creditCardId");
CREATE INDEX "transactions_parentTransactionId_idx" ON "transactions"("parentTransactionId");

ALTER TABLE "credit_cards"
ADD CONSTRAINT "credit_cards_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "transactions"
ADD CONSTRAINT "transactions_creditCardId_fkey"
FOREIGN KEY ("creditCardId") REFERENCES "credit_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "transactions"
ADD CONSTRAINT "transactions_parentTransactionId_fkey"
FOREIGN KEY ("parentTransactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;