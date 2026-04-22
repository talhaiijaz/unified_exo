export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-4 hover:scale-105 transition-transform cursor-pointer">
              Berkeley Nanotech
            </div>
            <p className="text-muted-foreground mb-4 max-w-md">
              UC Berkeley Nanotechnology Lab - Pioneering research in carbon nanotube sensors and multidisciplinary
              innovations.
            </p>
            <p className="text-sm text-muted-foreground">Led by Dr. Waqas Khalid</p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {["Home", "Research", "About", "Publications", "Team"].map((link) => (
                <li key={link}>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Contact</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>UC Berkeley</li>
              <li>Berkeley, CA 94720</li>
              <li className="pt-2">
                <a href="mailto:contact@nanotech.berkeley.edu" className="hover:text-primary transition-colors">
                  contact@nanotech.berkeley.edu
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} UC Berkeley Nanotechnology Lab. All rights reserved.
          </p>
          <div className="flex gap-6">
            
            
          </div>
        </div>
      </div>
    </footer>
  )
}
