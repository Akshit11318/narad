import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '../components/layout';
import { Button } from '../components/ui';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    id: '1',
    question: 'How secure is my vote?',
    answer: 'Your vote is protected by advanced cryptographic encryption using WebAssembly-based zero-knowledge proofs. The vote is encrypted on your device before transmission and stored on an immutable blockchain, ensuring complete privacy while maintaining verifiable transparency.'
  },
  {
    id: '2',
    question: 'Can I change my vote after submission?',
    answer: 'No, once your vote is submitted and recorded on the blockchain, it cannot be changed or deleted. This immutability is a key feature that ensures the integrity of the election. Please review your selection carefully before confirming.'
  },  {
    id: '3',
    question: 'How do I know my vote was counted?',
    answer: 'After submitting your vote, you will receive a zero-knowledge proof verification that confirms your vote was recorded. This cryptographic proof validates that your vote is included in the final tally without revealing how you voted.'
  },
  {
    id: '4',
    question: 'What if I encounter technical issues?',
    answer: 'If you experience any technical difficulties, try refreshing the page first. Ensure you have a stable internet connection and that JavaScript is enabled in your browser. If problems persist, contact the election support team immediately.'
  },
  {
    id: '5',
    question: 'How long does the voting process take?',
    answer: 'The entire voting process typically takes 2-3 minutes, including candidate selection, vote encryption, and blockchain submission. The encryption process may take a few seconds depending on your device performance.'
  },
  {
    id: '6',
    question: 'What browsers are supported?',
    answer: 'The voting portal supports modern browsers including Chrome 90+, Firefox 88+, Safari 14+, and Edge 90+. WebAssembly support is required for the encryption functionality.'
  },
  {
    id: '7',
    question: 'Is my personal information stored?',
    answer: 'Only your voter ID and voting status are stored. Your vote choice is encrypted and cannot be linked back to your identity. Personal information is handled according to strict privacy policies and data protection regulations.'
  },
  {
    id: '8',
    question: 'What happens if I lose internet connection?',
    answer: 'If you lose connection during the voting process, your progress is saved locally. When connection is restored, you can continue from where you left off. However, the final vote submission requires a stable internet connection.'
  }
];

export function Help() {
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    setOpenItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            Help & Support
          </h1>
          <p className="text-xl text-gray-400">
            Frequently asked questions about the secure voting process
          </p>
        </motion.div>

        {/* Security Overview */}
        <motion.div
          className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Secure Voting Technology</h3>
              <p className="text-gray-400 text-sm mb-4">
                This voting system uses cutting-edge cryptographic technology to ensure your vote is private, secure, and verifiable.
              </p>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center text-green-400">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  End-to-end encryption
                </div>
                <div className="flex items-center text-green-400">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Zero-knowledge proofs
                </div>
                <div className="flex items-center text-green-400">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Blockchain immutability
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          
          {faqData.map((item, index) => (
            <motion.div
              key={item.id}
              className="bg-gray-900/80 backdrop-blur-xl border border-gray-700 rounded-xl overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.4 }}
            >
              <button
                onClick={() => toggleItem(item.id)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-800/50 transition-colors duration-200"
              >
                <h3 className="text-lg font-medium text-white pr-4">{item.question}</h3>
                <motion.svg
                  className="w-5 h-5 text-gray-400 flex-shrink-0"
                  animate={{ rotate: openItems.includes(item.id) ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </button>
              
              <AnimatePresence>
                {openItems.includes(item.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-4 text-gray-400 leading-relaxed">
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>

        {/* Contact Support */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700 rounded-xl p-8">
            <h3 className="text-xl font-semibold text-white mb-4">Need Additional Help?</h3>
            <p className="text-gray-400 mb-6">
              If you couldn't find the answer to your question, our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="primary"
                onClick={() => window.location.href = 'mailto:support@voting-system.gov'}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 3.26a2 2 0 001.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Support
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = 'tel:+1-800-VOTE-HELP'}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call Support
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
