## Simple site: Easy websites with GitHub pages

[Github Pages](https://pages.github.com) provide a simple way to make a
website using Markdown and git.

This is a minimal tutorial to get started.

View the thing [here](https://kbroman.org/simple_site).

## Running locally

### Prerequisites

- Ruby (version 2.5.0 or higher)
- RubyGems
- Bundler

#### Installing Prerequisites

1. **Install Ruby**:

   - **Windows**: Download and install from [RubyInstaller](https://rubyinstaller.org/)
   - **macOS**: Using Homebrew:
     ```bash
     brew install ruby
     ```
   - **Linux**:
     ```bash
     sudo apt-get install ruby-full
     ```

2. **Install RubyGems**:

   - RubyGems comes installed with Ruby by default
   - To update RubyGems:
     ```bash
     gem update --system
     ```

3. **Install Bundler**:
   ```bash
   gem install bundler
   ```

### Setup and Run

1. Clone this repository:

   ```bash
   git clone https://github.com/kbroman/simple_site.git
   cd simple_site
   ```

2. Install dependencies:

   ```bash
   bundle install
   ```

3. Start the local server:

   ```bash
   bundle exec jekyll serve
   ```

4. View the site at [http://localhost:4000](http://localhost:4000)

---

To the extent possible under law,
[Karl Broman](https://github.com/kbroman)
has waived all copyright and related or neighboring rights to
&ldquo;[simple site](https://github.com/kbroman/simple_site)&rdquo;.
This work is published from the United States.
<br/>
[![CC0](https://i.creativecommons.org/p/zero/1.0/88x31.png)](https://creativecommons.org/publicdomain/zero/1.0/)
