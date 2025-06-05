function Footer() {
  return (
    <>
      <footer className="container absolute w-[calc(100%-32px)] translate-x-[-50%] left-1/2 bottom-4 bg-[var(--thin)] rounded-lg h-18 flex justify-between py-5 px-10">
        <div className="w-full mx-auto md:flex md:items-center md:justify-between">
          <span className="text-sm text-gray-500 sm:text-center dark:text-gray-400">© 2025 <a href="/" className="hover:underline">Akshiro</a>. All Rights Reserved.
        </span>
        <ul className="flex flex-wrap items-center mt-3 text-sm font-medium text-gray-500 dark:text-gray-400 sm:mt-0">
          <li>
            <a href="/" className="hover:underline me-4 md:me-6">MyGamesList by Akshiro.</a>
          </li>
        </ul>
        </div>
      </footer>
    </>
  );
}

export default Footer;
