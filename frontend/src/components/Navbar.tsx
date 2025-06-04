function Navbar() {
  return (
    <>
      <nav className="container fixed top-4 w-[calc(100%-32px)] translate-x-[-50%] left-1/2 bg-[var(--thin)] rounded-lg h-18 flex justify-between py-5 px-10">
        <a className="flex items-center" href="/">
          <img src="../public/logo/logo_AK.png" alt="" className="h-full" />
          <p className="ms-4 text-xl">Akshiro</p>
        </a>

        <a href="https://github.com/Akshiro28/react-tailwind-app" target="_blank" rel="noopener noreferrer">
          <img src="../public/logo/github.png" alt="" className="h-full ms-auto" />
        </a>
      </nav>
    </>
  );
}

export default Navbar;
