const Airtable = require('airtable');

// Initialize Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN })
  .base(process.env.AIRTABLE_BASE_ID);

module.exports = async (req, res) => {
  // Verify API key
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.GPT_ACTIONS_API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Create new user
    const newRecord = await base(process.env.AIRTABLE_TABLE_NAME).create([
      {
        fields: {
          Email: email,
          CreatedAt: new Date().toISOString(),
          SubscriptionStatus: 'inactive'
        }
      }
    ]);

    return res.status(201).json({ 
      success: true,
      userId: newRecord[0].id,
      record: newRecord[0].fields
    });
  } catch (error) {
    console.error('Error in create-user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};