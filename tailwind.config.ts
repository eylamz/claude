import type { Config } from 'tailwindcss';
import { colors } from './lib/utils/colors';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './stores/**/*.{js,ts,jsx,tsx,mdx}',
    './types/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      maxWidth: {
        '5xxl': '1070px',
      },
      screens: {
        'xxs': '360px',
        'xsm': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1150px',
        '2xl': '1280px',
        '3xl': '1440px',
      },
      fontFamily: {
        sans: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
        'poppins': ['var(--font-poppins)', 'system-ui', 'sans-serif'],
        'arimo': ['var(--font-arimo)', 'system-ui', 'sans-serif'],
        rtl: ['var(--font-arimo)', 'system-ui', 'sans-serif'],
        ltr: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        custom: '12px'
      },
      boxShadow: {
        headerShadow: '0 1px 28px 0 rgba(0, 0, 0, 0.2)',
        container: '0 0 10px 0 rgba(0, 0, 0, 0.09)',
        insideBox: 'inset 0px 0px 12px rgba(0,0,0, 0.15)',
        boxDark: 'inset 0 0 0 1px rgba(255,255,255,0.2)',
        borderDark: 'inset 0 -1px 0 0 rgba(255,255,255,0.12)',
        badge: '0px 2px 6px 2px rgba(0, 0, 0, 0.3)',
        badgeMd: '0px 2px 10px 2px rgba(0, 0, 0, 0.4)',
        image: '0 2px 6px 0 rgba(0, 0, 0, 0.1)',
        imageDark: '0 2px 6px 0 rgba(255, 255, 255, 0.05)',
        imageHover: '0 0px 8px 0 rgba(0, 0, 0, 0.25)',
        imageDarkHover: '0 2px 12px 0 rgba(255, 255, 255, 0.15)',
      },
      borderRadius: {
        custom: '30px'
      },
      colors: {
        // Adding our custom colors
        brand: {
          50: colors.brand[50],
          100: colors.brand[100],
          200: colors.brand[200],
          300: colors.brand[300],
          400: colors.brand[400],
          500: colors.brand[500],
          600: colors.brand[600],
          700: colors.brand[700],
          800: colors.brand[800],
          900: colors.brand[900],
          main: colors.brand.main,
          dark: colors.brand.dark,
          text: colors.brand.text,
          color: colors.brand.color,
          accent: colors.brand.accent,


          orange: colors.brand.orange,
          red: colors.brand.red,
          yellow: colors.brand.yellow,
          purple: colors.brand.purple,
          pink: colors.brand.pink,
          blue: colors.brand.blue,
          green: colors.brand.green,
        },
        background: {
          DEFAULT: colors.background.light,
          dark: colors.background.dark,
        },
          card: {
            DEFAULT: colors.card.light,
            dark: colors.card.dark,
            muted: {
               DEFAULT: colors.card.muted.light,
              dark: colors.card.muted.dark
            },

            border: {
              DEFAULT: colors.card.border.light,
              dark: colors.card.border.dark,
            },
            icon: {
              DEFAULT: colors.card.icon.light,
              dark: colors.card.icon.dark,
            },
        },
        'background-secondary': {
          DEFAULT: colors.backgroundSecondary.light,
          dark: colors.backgroundSecondary.dark,
        },
        content: {
          DEFAULT: colors.text.light,
          dark: colors.text.dark,
        },
        'content-secondary': {
          DEFAULT: colors.text.secondary.light,
          dark: colors.text.secondary.dark,
        },
        icons: {
          DEFAULT: colors.icons.light,
          dark: colors.icons.dark,
        },
        tooltip: {
          DEFAULT: colors.tooltip.light,
          dark: colors.tooltip.dark,
        },
          header: {
            DEFAULT: colors.header.light,
            dark: colors.header.dark,
            border: {
              DEFAULT: colors.header.border.light,
              dark: colors.header.border.dark,
            },
            text: {
              DEFAULT: colors.header.text.light,
              dark: colors.header.text.dark,
            },
            icon: {
              DEFAULT: colors.header.icon.light,
              dark: colors.header.icon.dark,
            },
            guide: {
              DEFAULT: colors.header.guide.light,
              dark: colors.header.guide.dark,
              text: {
                DEFAULT: colors.header.guide.text.light,
                dark: colors.header.guide.text.dark,
              },
            },
          },
        sidebar: {
          DEFAULT: colors.sidebar.light,
          dark: colors.sidebar.dark,
          text: {
            DEFAULT: colors.sidebar.text.light,
            dark: colors.sidebar.text.dark,
            brand: {
              DEFAULT: colors.sidebar.text.brand.light,
              dark: colors.sidebar.text.brand.dark,
            },
          },
          hover: {
            DEFAULT: colors.sidebar.hover.light,
            dark: colors.sidebar.hover.dark,
            brand: {
              DEFAULT: colors.sidebar.hover.brand.light,
              dark: colors.sidebar.hover.brand.dark,
            },
          },
          border: {
            DEFAULT: colors.sidebar.border.light,
            dark: colors.sidebar.border.dark,
            brand: {
              DEFAULT: colors.sidebar.border.brand.light,
              dark: colors.sidebar.border.brand.dark,
            },
          },
          icon: {
            DEFAULT: colors.sidebar.icon.light,
            dark: colors.sidebar.icon.dark,
            brand: {
              DEFAULT: colors.sidebar.icon.brand.light,
              dark: colors.sidebar.icon.brand.dark,
            },
          },
        },
        primary: {
          DEFAULT: colors.brand.main,
          dark: colors.brand[400]
        },
        hover: {
          DEFAULT: colors.backgroundAccent.light,
          dark: colors.backgroundAccent.dark,
        },

        text: {
          DEFAULT: colors.text.light,
          dark: colors.text.dark,
          hover: {
            DEFAULT: colors.text.hover.light,
            dark: colors.text.hover.dark
          },
          heading: {
            DEFAULT: colors.text.heading.light,
            dark: colors.text.heading.dark,
          },
          secondary: {
            DEFAULT: colors.text.secondary.light,
            dark: colors.text.secondary.dark,
          },
          guide: {
            DEFAULT: colors.text.guide.light,
            dark: colors.text.guide.dark,
          },
        },
        accent: {
          DEFAULT: colors.brand[300],
          dark: colors.brand[600]
        },
        border: {
          DEFAULT: colors.border.light,
          dark: colors.border.dark,
          primary: colors.border.primary,
          inner: {
            DEFAULT: colors.border.inner.light,
            dark: colors.border.inner.dark,  
          }
        },
        popover: {
          DEFAULT: colors.popover.light,
          dark: colors.popover.dark,
          border: {
            DEFAULT: colors.popover.border.light,
            dark: colors.popover.border.dark,
          },
        },
        input: {
          DEFAULT: colors.input.light,
          dark: colors.input.dark,
          hover: {
            DEFAULT: colors.input.hover.light,
            dark: colors.input.hover.dark,
          },
          text: {
            DEFAULT: colors.input.text.light,
            dark: colors.input.text.dark,
          },
          border: {
            DEFAULT: colors.input.border.light,
            dark: colors.input.border.dark,
          },
        },
        btn: {
          DEFAULT: colors.btn.light,
          dark: colors.btn.dark,
            hover: {
              DEFAULT: colors.btn.hover.light,
              dark: colors.btn.hover.dark,
            },
            secondary: {
              DEFAULT: colors.btn.secondary.light,
              dark: colors.btn.secondary.dark,
              text: {
                DEFAULT: colors.btn.secondary.text.light,
                dark: colors.btn.secondary.text.dark,
              },
              hover: {
                DEFAULT: colors.btn.secondary.hover.light,
                dark: colors.btn.secondary.hover.dark,
              },
              disabled: {
                DEFAULT: colors.btn.secondary.disabled.light,
                dark: colors.btn.secondary.disabled.dark,
              },
              disabledText: {
                DEFAULT: colors.btn.secondary.disabledText.light,
                dark: colors.btn.secondary.disabledText.dark,
              },
            },
      },
        switch: {
            background: {
              DEFAULT: colors.switch.background.light,
              dark: colors.switch.background.dark,
              checked: {
                DEFAULT: colors.switch.background.checked.light,
                dark: colors.switch.background.checked.dark,
              }
            },
            btn: {
              DEFAULT: colors.switch.btn.light,
              dark: colors.switch.btn.dark,
          },
        },
        toast: {
          DEFAULT: colors.toast.light,
          dark: colors.toast.dark,
            bg: {
              DEFAULT: colors.toast.bg.light,
              dark: colors.toast.bg.dark
            },
            border: {
              DEFAULT: colors.toast.border.light,
              dark: colors.toast.border.dark
            },
        },
        success: {
          DEFAULT: colors.success.light,
          dark: colors.success.dark,
            bg: {
              DEFAULT: colors.success.bg.light,
              dark: colors.success.bg.dark
            },
            border: {
              DEFAULT: colors.success.border.light,
              dark: colors.success.border.dark
            },
        },
        error: {
          DEFAULT: colors.error.light,
          dark: colors.error.dark,
          bg: {
            DEFAULT: colors.error.bg.light,
            dark: colors.error.bg.dark
          },
          border: {
            DEFAULT: colors.error.border.light,
            dark: colors.error.border.dark
          },
      },
        warning: {
          DEFAULT: colors.warning.light,
          dark: colors.warning.dark,
            bg: {
              DEFAULT: colors.warning.bg.light,
              dark: colors.warning.bg.dark
            },
            border: {
              DEFAULT: colors.warning.border.light,
              dark: colors.warning.border.dark
            },
          },
            info: {
              DEFAULT: colors.info.light,
              dark: colors.info.dark,
                bg: {
                  DEFAULT: colors.info.bg.light,
                  dark: colors.info.bg.dark
                },
                border: {
                  DEFAULT: colors.info.border.light,
                  dark: colors.info.border.dark
                },
            },

            blue: {
              DEFAULT: colors.blue.light,
              dark: colors.blue.dark,
              bg: {
                DEFAULT: colors.blue.bg.light,
                dark: colors.blue.bg.dark,
              },
              border: {
                DEFAULT: colors.blue.border.light,
                dark: colors.blue.border.dark,
              },
              hover: {
                bg: {
                  DEFAULT: colors.blue.hover.bg.light,
                  dark: colors.blue.hover.bg.dark,
                },
              },
            },

            gray: {
              DEFAULT: colors.gray.light,
              dark: colors.gray.dark,
              bg: {
                DEFAULT: colors.gray.bg.light,
                dark: colors.gray.bg.dark,
              },
              border: {
                DEFAULT: colors.gray.border.light,
                dark: colors.gray.border.dark,
              },
              hover: {
                bg: {
                  DEFAULT: colors.gray.hover.bg.light,
                  dark: colors.gray.hover.bg.dark,
                },
              },
            },

            green: {
              DEFAULT: colors.green.light,
              dark: colors.green.dark,
              bg: {
                DEFAULT: colors.green.bg.light,
                dark: colors.green.bg.dark,
              },
              border: {
                DEFAULT: colors.green.border.light,
                dark: colors.green.border.dark,
              },
              hover: {
                bg: {
                  DEFAULT: colors.green.hover.bg.light,
                  dark: colors.green.hover.bg.dark,
                },
              },
            },

            orange: {
              DEFAULT: colors.orange.light,
              dark: colors.orange.dark,
              bg: {
                DEFAULT: colors.orange.bg.light,
                dark: colors.orange.bg.dark,
              },
              border: {
                DEFAULT: colors.orange.border.light,
                dark: colors.orange.border.dark,
              },
              hover: {
                bg: {
                  DEFAULT: colors.orange.hover.bg.light,
                  dark: colors.orange.hover.bg.dark,
                },
              },
            },

            red: {
              DEFAULT: colors.red.light,
              dark: colors.red.dark,
              bg: {
                DEFAULT: colors.red.bg.light,
                dark: colors.red.bg.dark,
              },
              border: {
                DEFAULT: colors.red.border.light,
                dark: colors.red.border.dark,
              },
              hover: {
                bg: {
                  DEFAULT: colors.red.hover.bg.light,
                  dark: colors.red.hover.bg.dark,
                },
              },
            },

            purple: {
              DEFAULT: colors.purple.light,
              dark: colors.purple.dark,
              bg: {
                DEFAULT: colors.purple.bg.light,
                dark: colors.purple.bg.dark,
              },
              border: {
                DEFAULT: colors.purple.border.light,
                dark: colors.purple.border.dark,
              },
              hover: {
                bg: {
                  DEFAULT: colors.purple.hover.bg.light,
                  dark: colors.purple.hover.bg.dark,
                },
              },
            },


        ring: {
          DEFAULT: colors.brand.main,
          dark: colors.brand[400]
        },
        button: {
          DEFAULT: colors.brand.main,
          dark: colors.brand[400]
        },
        destructive: '#d90505',
        'destructive-foreground': '#fff',
      },
      keyframes: {
        'bounce-left': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-5px)' },
          '80%': { transform: 'translateX(3px)' },
        },
        'fadeUpIn': {
          '0%': { 
            opacity: '0',
            transform: 'translateY(20px)'
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'fadeInUp': {
          '0%': { 
            opacity: '0',
            transform: 'translateY(30px)'
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'fadeInDown': {
          '0%': { 
            opacity: '0',
            transform: 'translateY(-1rem)'
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'bounchInDown': {
          '0%': { 
            transform: 'translateY(-20px)',
            opacity: '0.2',
          },
          '50%': { 
            opacity: '0.5',
          },
          '100%': { 
            transform: 'translateY(0)',
            opacity: '1',
          },
        },
        'shimmerMove': {
          'from': { right: '-100%' },
          'to': { right: '100%' }
        },
        'shimmerInfinite': {
          'from': { right: '-100%' },
          'to': { right: '100%' }
        },
        'infiniteLoader': {
          '0%': { right: '0%' },
          '25%': { right: '-20%' },
          '75%': { right: '70%' },
          '100%': { right: '0%' }
        },
        
        'expandWidth': {
          '0%': { width: '50px', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { width: '100%' }
        },
        'expandHeight': {
          '0%': { height: '0px' },
          '100%': { height: '100%' }
        },
        'bounce-right': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '60%': { transform: 'translateX(5px)' },
          '80%': { transform: 'translateX(-3px)' },
        },
        slideIn: {
          '0%': { 
            opacity: '0',
            transform: 'scale(0.95) translateX(-10px)'
          },
          '100%': { 
            opacity: '1',
            transform: 'scale(1) translateX(0)'
          },
        },
        slideRight: {
          '0%': { 
            transform: 'translateX(-30px)',
            opacity: '0.2',
            scale: '0.95'
          },
          '50%': { 
            opacity: '0.5',
            scale: '1.05'
          },
          '100%': { 
            transform: 'translateX(0)',
            opacity: '1',
            scale: '1'
          },
        },
        slideLeft: {
          '0%': { 
            transform: 'translateX(30px)',
            opacity: '0.2',
            scale: '0.95'
          },
          '50%': { 
            opacity: '0.5',
            scale: '1.05'
          },
          '100%': { 
            transform: 'translateX(0)',
            opacity: '1',
            scale: '1'
          },
        },
        appearDown: {
          '0%': { 
            opacity: '0',
            transform: 'translateY(-500px)',
          },
          '50%': { 
            opacity: '0',
            transform: 'scale(0.95)'
          },
          '100%': { 
            opacity: '1',
            transform: 'translatey(0)',
          },
        },
        bounceDownSqueeze: {
          '0%': { 
            opacity: '0',
            transform: 'translateY(-30px) scaleY(0.8)',
          },
          '40%': { 
            opacity: '0.8',
            transform: 'translateY(5px) scaleY(1.1)',
          },
          '60%': { 
            opacity: '0.9',
            transform: 'translateY(-3px) scaleY(0.95)',
          },
          '80%': { 
            opacity: '1',
            transform: 'translateY(2px) scaleY(1.02)',
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0) scaleY(1)',
          },
        },
        scaleDownFade: {
          '0%': { 
            opacity: '1',
            transform: 'scale(1)'
          },
          '100%': { 
            opacity: '0',
            transform: 'scale(0.95) translateX(10px)'
          },
        },
        scaleFadeUp: {
          '0%': { 
            opacity: '0',
            transform: 'scale(0.95) translateY(-10px)'
          },
          '100%': { 
            opacity: '1',
            transform: 'scale(1)'
          },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' }
        },
        popIn: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' }
        },
        popFadeIn: {
          '0%': { 
            opacity: '0',
            transform: 'scale(0.95)'
          },
          '50%': { 
            opacity: '0.8',
            transform: 'scale(1.025)'
          },
          '100%': { 
            opacity: '1',
            transform: 'scale(1)'
          }
        },
          slideFromLeft: {
            '0%': { transform: 'translateX(-100%)' },
            '100%': { transform: 'translateX(0)' }
          },
          slideFromRight: {
            '0%': { opacity: '0', transform: 'translateX(100%)' },
            '30%': { opacity: '0.5' },
            '100%': { opacity: '1', transform: 'translateX(0)' }
          },
          slideToLeft: {
            '0%': { opacity: '0', transform: 'translateX(0%)' },
            '30%': { opacity: '0.5' },
            '100%': { opacity: '1', transform: 'translateX(-100%)' }
          },
          slideToRight: {
            '0%': { transform: 'translateX(0%)' },
            '100%': { transform: 'translateX(100%)' }
          },
          slideFromBottom: {
            '0%': { transform: 'translateY(100%)' },
            '100%': { transform: 'translateY(0)' }
          },
          slideToBottom: {
            '0%': { transform: 'translateY(0)' },
            '100%': { transform: 'translateY(100%)' }
          },
          skeleton: {
            '0%': { opacity: '0.5' },
            '50%': { opacity: '1' },
            '100%': { opacity: '0.5' },
          },
          'popUp': {
            '0%': { opacity: '0.2', transform: 'scale(1) translateY(25px)' },
            '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
          },
          popDown: {
            '0%': { opacity: '0.2', transform: 'scale(1) translateY(-20px)' },
            '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
          },
          popOutDown: {
            '0%': { opacity: '1', transform: 'scale(1) translateY(0)' },
            '100%': { opacity: '0', transform: 'scale(0.9) translateY(-15px)' },
          },
          'popOut': {
            '0%': { opacity: '1', transform: 'scale(1) translateY(0)' },
            '100%': { opacity: '0', transform: 'scale(0.9) translateY(15px)' },
          },
          'popoverIn': {
            '0%': { opacity: '0.2', transform: 'scale(1) translateY(-15px)' },
            '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },

          },
          'popoverOut': {
            '0%': { 
              opacity: '1',
              transform: 'scale(1) translateY(0)'
            },
            '100%': { 
              opacity: '0',
              transform: 'scale(0.95) translateY(-4px)'
            }
          },
          'selectClose': {
            '0%': { 
              opacity: '1',
              transform: 'scale(1) translateY(0)'
            },
            '100%': { 
              opacity: '0',
              transform: 'scale(0.9) translateY(-8px)'
            }
          },
          'borderFadeIn': {
            '0%': { 
              borderColor: 'transparent',
            },
            '100%': { 
              borderColor: '#4a4a4a',
            }
          },
          'borderFadeOut': {
            '0%': { 
              borderColor: '#4a4a4a',
            },
            '100%': { 
              borderColor: 'transparent',
            }
          },
          'parkNameHover': {
            '0%': { 
              opacity: '0',
              origin: 'bottom-left',
              transform: 'translateX(7%) translateY(-31%) rotate(0deg)'
            },
            '100%': { 
              opacity: '1',
              origin: 'bottom-left',
              transform: 'translateX(7%) translateY(-10%) rotate(2deg)'
            }
          },
          'parkNameHoverRtl': {
            '0%': { 
              opacity: '0',
              origin: 'bottom-right',
              transform: 'translateX(-7%) translateY(-31%) rotate(0deg)'
            },
            '100%': { 
              opacity: '1',
              origin: 'bottom-right',
              transform: 'translateX(-7%) translateY(-11%) rotate(-2deg)'
            }
          },
          'horizontalShaking': {
            '0%': { transform: 'translateX(0)', opacity: '0' },
            '25%': { transform: 'translateX(5px) ', opacity: '1' },
            '50%': { transform: 'translateX(-5px)' },
            '75%': { transform: 'translateX(5px)' },
            '100%': { transform: 'translateX(0)' }
          }
      },
      animation: {
        'popUp': 'popUp 0.2s ease-out forwards',
        'popOut': 'popOut 0.2s',
        'popDown': 'popDown 0.2s',
        'popOutDown': 'popOutDown 0.2s',
        'skeleton': 'skeleton 4s ease-in-out infinite',
        slideIn: 'slideIn  0.25s ease-out forwards',
        scaleDownFade: 'scaleDownFade 0.25s ease-in forwards',
        scaleFadeUp: 'scaleFadeUp 0.15s ease-in forwards',
        fadeIn: 'fadeIn 0.3s ease-out forwards',
        fadeOut: 'fadeOut 0.3s ease-out forwards',
        slideUp: 'slideUp 0.3s ease-out forwards',
        slideRight: 'slideRight 0.2s forwards',
        slideLeft: 'slideLeft 0.2s forwards',
        slideFromLeft: 'slideFromLeft 0.2s ease-out forwards',
        slideToLeft: 'slideToLeft 0.2s ease-out forwards',
        slideFromRight: 'slideFromRight 0.2s ease-out forwards',
        slideToRight: 'slideToRight 0.2s ease-out forwards',
        slideFromBottom: 'slideFromBottom 0.3s ease-out forwards',
        slideToBottom: 'slideToBottom 0.3s ease-out forwards',
        'bounce-left': 'bounce-left 0.4s ease-in-out',
        'bounce-right': 'bounce-right 0.4s ease-in-out',
        'pop': 'pop 0.3s ease-in-out',
        'popIn': 'popIn 0.5s ease-in-out',
        'expandWidth': 'expandWidth 0.3s ease-in forwards',
        'expandHeight': 'expandHeight 1s ease-in forwards',
        'popFadeIn': 'popFadeIn 0.5s ease-out forwards',
        'shimmer': 'shimmerMove 0.6s forwards',
        'shimmerInfinite': 'shimmerInfinite 1s ease-in-out infinite',
        'infiniteLoader': 'infiniteLoader 1s infinite',
        'fadeUpIn': 'fadeUpIn 0.6s ease-out forwards',
        'fadeInUp': 'fadeInUp 0.5s ease-out forwards',
        'fadeInDown': 'fadeInDown 0.2s ease-out forwards',
        'appearDown': 'appearDown 0.5s ease-out forwards',
        'bounchInDown': 'bounchInDown 0.2s forwards',
        'bounceDownSqueeze': 'bounceDownSqueeze 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards',
        'popoverIn': 'popoverIn 0.2s forwards',
        'popoverOut': 'popoverOut 0.15s forwards',
        'selectClose': 'selectClose 0.25s ease-out forwards',
        'borderFadeIn': 'borderFadeIn 0.2s ease-out forwards',
        'borderFadeOut': 'borderFadeOut 0.1s ease-out forwards',
        'parkNameHover': 'parkNameHover 0.5s cubic-bezier(0.76, 0, 0.24, 1) forwards 0.5s',
        'parkNameHoverRtl': 'parkNameHoverRtl 0.5s cubic-bezier(0.76, 0, 0.24, 1) forwards 0.5s',
        'horizontalShaking': 'horizontalShaking 0.5s ease-in-out forwards',
      },
    },
  },
  plugins: [
    // Add a plugin to handle RTL font switching
    function({ addBase, theme }: any) {
      addBase({
        '[dir="rtl"], [lang="he"]': {
          fontFamily: theme('fontFamily.rtl'),
        },
        '[dir="ltr"], [lang="en"]': {
          fontFamily: theme('fontFamily.ltr'),
        },
      });
    },
    // Add custom variants for rtl: and ltr: based on locale
    function({ addVariant }: any) {
      // rtl: variant - activates when locale is Hebrew (he)
      addVariant('rtl', '[dir="rtl"] &, [lang="he"] &');
      // ltr: variant - activates when locale is English (en)
      addVariant('ltr', '[dir="ltr"] &, [lang="en"] &');
    },
  ],
};

export default config;