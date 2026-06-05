"use client";

import HamburgerNav from "./HamburgerNav";

export default function NavWrapper({ items }: { items: { href: string; label: string }[] }) {
  return <HamburgerNav items={items} />;
}
