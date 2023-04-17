import cron from "node-cron";
import MongoDB from "./mongodb.js";

// get the environment variables
const {
  HOBBYIST_YEARLY,
  HOBBYIST_MONTHLY,
  BUSINESS_YEARLY,
  BUSINESS_MONTHLY,
  FREE_TIER,
  PRODUCTION,
  FREE_TIER_CREDIT,
  HOBBYIST_TIER_CREDIT,
  BUSINESS_TIER_CREDIT,
} = process.env;

let client;
// define the credit replenishment function
const replenishCredits = async () => {
  try {
    console.log("starting");
    const db = await MongoDB.getInstance().getDb();

    const collection = db.collection("users");
    console.log("getting all users");
    // get all users from the database
    const users = await collection.find().toArray();

    console.log("looping over all users");
    // iterate over each user and replenish their credits
    for (const user of users) {
      // determine the number of credits to add based on the user's plan
      let creditsToAdd;
      switch (user.planId) {
        case HOBBYIST_YEARLY:
        case HOBBYIST_MONTHLY:
          creditsToAdd = Number(HOBBYIST_TIER_CREDIT);
          break;
        case BUSINESS_YEARLY:
        case BUSINESS_MONTHLY:
          creditsToAdd = Number(BUSINESS_TIER_CREDIT);
          break;
        case FREE_TIER:
        default:
          creditsToAdd = Number(FREE_TIER_CREDIT);
      }

      // add the credits to the user's account
      console.log("-----------------------------------------------------");
      console.log(`before : user: ${user.email} credits: ${user.credits}`);
      const updatedUser = await collection.findOneAndUpdate(
        { _id: user._id },
        { $inc: { credits: creditsToAdd } },
        { returnOriginal: false }
      );
      console.log(
        `after: user: ${updatedUser.value.email}, credits: ${
          user.credits + creditsToAdd
        }`
      );
    }
  } catch (err) {
    console.error(err);
  }
};

// use node-cron to schedule the replenishCredits function to run at midnight each day
export async function scheduleCreditReplenish() {
  try {
    if (PRODUCTION === "true") {
      console.log("starting the cron job");
      await cron.schedule("* * * * *", replenishCredits); // run the function at midnight each day
      console.log("successfully scheduled the cron job");
    } else if (PRODUCTION === "false") {
      console.log("can't start the cron job this is not production server");
    } else {
      console.log(`production can't be ${PRODUCTION}`);
    }
  } catch (error) {
    console.error("failed to schedule the cron job:", error);
  }
}
