-- CreateTable "entities"
CREATE TABLE "entities" (
    "id" TEXT NOT NULL,
    "wikidataId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "pageviewsMonth" INTEGER NOT NULL,
    "wikiTextLength" INTEGER NOT NULL,
    "rarityScore" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "wikidataUrl" TEXT NOT NULL,
    "wikipediaUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable "cards"
CREATE TABLE "cards" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageWidth" INTEGER NOT NULL,
    "imageHeight" INTEGER NOT NULL,
    "imageLicenseAuthor" TEXT,
    "imageLicenseType" TEXT,
    "imageLicenseUrl" TEXT,
    "imageSourceUrl" TEXT,
    "displayOrder" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable "albums"
CREATE TABLE "albums" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable "card_albums"
CREATE TABLE "card_albums" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,

    CONSTRAINT "card_albums_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entities_wikidataId_key" ON "entities"("wikidataId");

-- CreateIndex
CREATE UNIQUE INDEX "cards_entityId_key" ON "cards"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "albums_slug_key" ON "albums"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "card_albums_cardId_albumId_key" ON "card_albums"("cardId", "albumId");

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_albums" ADD CONSTRAINT "card_albums_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_albums" ADD CONSTRAINT "card_albums_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
