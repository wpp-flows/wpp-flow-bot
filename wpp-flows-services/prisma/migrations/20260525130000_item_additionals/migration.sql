-- Optional list of additionals (extras) that the customer can tick when
-- ordering an item on the public menu. JSON keeps the shape flexible while
-- avoiding a join for a list that's almost always short.
ALTER TABLE "menu_item" ADD COLUMN "additionals" JSONB;
