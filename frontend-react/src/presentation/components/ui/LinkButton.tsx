/**
 * LinkButton — a link that looks like a `Button`.
 *
 * Navigation stays a link (`<a>`), so it is never a button inside a link.
 * Pass `to` for an in-app route or `href` for a file or an external page.
 */

import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { buttonClassName, type ButtonSize, type ButtonVariant } from './buttonStyles'

interface LinkButtonLook {
  variant?: ButtonVariant
  size?: ButtonSize
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

type RouteLinkButtonProps = LinkButtonLook & LinkProps & { href?: never; external?: never }
type AnchorLinkButtonProps = LinkButtonLook &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; to?: never; external?: boolean }

export type LinkButtonProps = RouteLinkButtonProps | AnchorLinkButtonProps

export function LinkButton(props: LinkButtonProps) {
  const { variant, size, leftIcon, rightIcon, className, children, ...rest } = props
  const classes = buttonClassName({ variant, size, className: className as string | undefined })
  const content = (
    <>
      {leftIcon}
      {children}
      {rightIcon}
    </>
  )
  if ('to' in rest && rest.to !== undefined) {
    return (
      <Link {...(rest as LinkProps)} className={classes}>
        {content}
      </Link>
    )
  }
  const { external, ...anchor } = rest as Omit<AnchorLinkButtonProps, keyof LinkButtonLook | 'className' | 'children'>
  return (
    <a {...anchor} className={classes} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {content}
    </a>
  )
}
