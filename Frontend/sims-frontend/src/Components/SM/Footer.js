import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-[#4B553A] text-white text-center py-4 mt-auto shadow-inner">
      <p className="text-sm">
        © {new Date().getFullYear()} Solio Inventory Management System. All rights reserved.
      </p>
    </footer>
  );
};

export default Footer;
