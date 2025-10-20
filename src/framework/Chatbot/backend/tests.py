import unittest
from pryon_conversation import Conversation

class Test_Pryon_Conversation(unittest.TestCase):

    def test_initialization(self):
        my_convo = Conversation()
        self.assertTrue(my_convo.access_token)

    def test_send_query(self):
        my_convo = Conversation()
        result = my_convo.send_query("How many cores per node on Grace cluster?")
        self.assertFalse(result)
if __name__ == '__main__':
    unittest.main()