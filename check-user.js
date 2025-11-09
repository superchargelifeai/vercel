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
    // Check if user exists
    const records = await base(process.env.AIRTABLE_TABLE_NAME)
      .select({
        filterByFormula: `{Email} = '${email}'`,
        maxRecords: 1
      })
      .firstPage();

    if (records.length > 0) {
      // User exists
      return res.status(200).json({ 
        exists: true, 
        userId: records[0].id,
        record: records[0].fields
      });
    } else {
      // User does not exist
      return res.status(404).json({ 
        exists: false,
        message: 'User not found'
      });
    }
  } catch (error) {
    console.error('Error in check-user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};