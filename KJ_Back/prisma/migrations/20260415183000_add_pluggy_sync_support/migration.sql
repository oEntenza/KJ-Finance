-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('MANUAL', 'PLUGGY');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'BANK_TRANSFER';

-- AlterTable
ALTER TABLE "transactions"
ADD COLUMN "source" "TransactionSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "externalId" TEXT,
ADD COLUMN "externalData" JSONB,
ADD COLUMN "pluggyAccountId" TEXT;

-- CreateTable
CREATE TABLE "pluggy_items" (
    "id" TEXT NOT NULL,
    "pluggyItemId" TEXT NOT NULL,
    "status" TEXT,
    "connectorName" TEXT,
    "itemCreatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "pluggy_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pluggy_accounts" (
    "id" TEXT NOT NULL,
    "pluggyAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "subtype" TEXT,
    "currencyCode" TEXT,
    "balance" DECIMAL(14,2),
    "lastSyncedAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "pluggy_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transactions_source_externalId_key" ON "transactions"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "pluggy_items_pluggyItemId_key" ON "pluggy_items"("pluggyItemId");

-- CreateIndex
CREATE UNIQUE INDEX "pluggy_items_userId_pluggyItemId_key" ON "pluggy_items"("userId", "pluggyItemId");

-- CreateIndex
CREATE UNIQUE INDEX "pluggy_accounts_pluggyAccountId_key" ON "pluggy_accounts"("pluggyAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "pluggy_accounts_itemId_pluggyAccountId_key" ON "pluggy_accounts"("itemId", "pluggyAccountId");

-- AddForeignKey
ALTER TABLE "transactions"
ADD CONSTRAINT "transactions_pluggyAccountId_fkey" FOREIGN KEY ("pluggyAccountId") REFERENCES "pluggy_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pluggy_items"
ADD CONSTRAINT "pluggy_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pluggy_accounts"
ADD CONSTRAINT "pluggy_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pluggy_accounts"
ADD CONSTRAINT "pluggy_accounts_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "pluggy_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
