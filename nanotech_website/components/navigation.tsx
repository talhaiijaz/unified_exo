"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X, Moon, Sun } from "lucide-react"
import Link from "next/link"
import { useTheme } from "next-themes"

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navLinks = [
    { name: "Home", href: "/#home" },
    { name: "Research", href: "/#research" },
    { name: "Projects", href: "/#projects" },
    { name: "About", href: "/#about" },
    { name: "Team", href: "/#team" },
  ]

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isMobileMenuOpen
          ? "bg-background border-b border-border"
          : isScrolled
          ? "bg-background/80 backdrop-blur-lg border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link href="/">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent hover:scale-105 transition-transform cursor-pointer">
              Berkeley Nanotech
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.name}
              </a>
            ))}
            <Link href="/portal">
              <Button
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
              >
                Portal
              </Button>
            </Link>
            <Button
              variant="outline"
              className="border-border"
              onClick={() => setTheme((resolvedTheme ?? 'dark') === 'dark' ? 'light' : 'dark')}
              title="Toggle theme"
            >
              {!mounted ? <Sun size={18} /> : (resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />)}
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden text-foreground" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border max-h-[calc(100vh-4rem)] overflow-y-auto">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
            <Link href="/portal">
              <Button
                variant="outline"
                className="w-full mt-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
              >
                Portal
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full mt-2 border-border"
              onClick={() => setTheme((resolvedTheme ?? 'dark') === 'dark' ? 'light' : 'dark')}
              title="Toggle theme"
            >
              {!mounted ? 'Light Mode' : ((resolvedTheme === 'dark') ? 'Light Mode' : 'Dark Mode')}
            </Button>
          </div>
        )}
      </div>
    </nav>
  )
}
