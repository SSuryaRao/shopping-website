export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm">
            © {new Date().getFullYear()} Smart Shoppy. All rights reserved.
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <a
              href="https://merchant.razorpay.com/policy/RIwRkvOb19eD9N/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Terms of Service
            </a>
            <a
              href="https://merchant.razorpay.com/policy/RIwRkvOb19eD9N/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="https://merchant.razorpay.com/policy/RIwRkvOb19eD9N/refund"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Refund Policy
            </a>
            <a
              href="https://merchant.razorpay.com/policy/RIwRkvOb19eD9N/contact_us"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
