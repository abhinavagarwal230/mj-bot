const { task, uuid } = JSON.parse(message.content);
console.log("I am here");
const messages = await message.channel.messages.fetch({ limit: 100 });
const keywordMessages = messages.find(
  (m) => m.content.includes(uuid) && m.author.username === "Midjourney Bot"
);
if (keywordMessages.components.length > 0) {
  // Loop through each ActionRow in the message's components
  for (const actionRow of keywordMessages.components) {
    // Loop through each Button in the ActionRow
    for (const button of actionRow.components) {
      if (button.label === task) {
        console.log("inside");
        return;
        keywordMessages.clickButton(button.customId);
      }
    }
  }
}

app.post("/uv", async (req, res) => {
  const { uuid, task } = req.query;
  try {
    await sendUpscaleNVariation(JSON.stringify({ task: task, uuid: uuid }));
    return res.json({ message: "done" });
  } catch (err) {
    console.log("error");
  }
});

export const sendUpscaleNVariation = async (message) => {
  const channel = await client.channels.fetch(process.env.CHANNEL_ID);
  try {
    await channel.send(message);
  } catch (err) {
    console.log(err, "could not send message");
  }
};
