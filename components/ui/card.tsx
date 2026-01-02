import * as React from "react";

import { cn } from "@/lib/utils";



// Define a type for polymorphic components with 'as' prop

type PolymorphicRef<C extends React.ElementType> = React.Ref<

  React.ComponentPropsWithoutRef<C>

>;



type PolymorphicComponentProps<C extends React.ElementType, Props = {}> = {

  as?: C;

} & Omit<React.ComponentPropsWithoutRef<C>, "as" | keyof Props> &

  Props;



type PolymorphicComponentPropsWithRef<

  C extends React.ElementType,

  Props = {}

> = PolymorphicComponentProps<C, Props> & { ref?: PolymorphicRef<C> };



// Create a type for the Card component

interface CardComponent extends React.ForwardRefExoticComponent<any> {

  <C extends React.ElementType = "div">(

    props: PolymorphicComponentPropsWithRef<C, {}>

  ): React.ReactElement | null;

  displayName?: string; // Add displayName to the interface

}



// Create the Card component with polymorphic support

const Card = React.forwardRef(

  <C extends React.ElementType = "div">(

    { as, className, children, ...props }: PolymorphicComponentPropsWithRef<C, {}>,

    ref: PolymorphicRef<C>

  ) => {

    const Component = as || "div";



    return (

      <Component

        ref={ref}

        className={cn(

          "rounded-3xl p-2 md:p-6 overflow-hidden text-card-foreground",

          className

        )}

        {...props}

      >

        {children}

      </Component>

    );

  }

) as CardComponent; // Type assertion here

Card.displayName = "Card";



// Other card components remain mostly the same

const CardHeader = React.forwardRef<

  HTMLDivElement,

  React.HTMLAttributes<HTMLDivElement>

>(({ className, ...props }, ref) => (

  <div

    ref={ref}

    className={cn("flex flex-col space-y-1.5 mb-3", className)}

    {...props}

  />

));

CardHeader.displayName = "CardHeader";



const CardTitle = React.forwardRef<

  HTMLHeadingElement,

  React.HTMLAttributes<HTMLHeadingElement>

>(({ className, ...props }, ref) => (

  <h3

    ref={ref}

    className={cn(

      "text-2xl font-semibold leading-none tracking-tight",

      className

    )}

    {...props}

  />

));

CardTitle.displayName = "CardTitle";



const CardDescription = React.forwardRef<

  HTMLParagraphElement,

  React.HTMLAttributes<HTMLParagraphElement>

>(({ className, ...props }, ref) => (

  <p

    ref={ref}

    className={cn("text-sm text-muted-foreground", className)}

    {...props}

  />

));

CardDescription.displayName = "CardDescription";



const CardContent = React.forwardRef<

  HTMLDivElement,

  React.HTMLAttributes<HTMLDivElement>

>(({ className, children, ...props }, ref) => (

  <div ref={ref} className={cn("p-0 pt-0", className)} {...props}>

    {children}

  </div>

));

CardContent.displayName = "CardContent";



const CardFooter = React.forwardRef<

  HTMLDivElement,

  React.HTMLAttributes<HTMLDivElement>

>(({ className, children, ...props }, ref) => (

  <div

    ref={ref}

    className={cn("flex items-center p-6 pt-0", className)}

    {...props}

  >

    {children}

  </div>

));

CardFooter.displayName = "CardFooter";



export type CardProps<C extends React.ElementType = "div"> =

  PolymorphicComponentPropsWithRef<C>;

export type CardHeaderProps = React.ComponentPropsWithoutRef<typeof CardHeader>;

export type CardTitleProps = React.ComponentPropsWithoutRef<typeof CardTitle>;

export type CardDescriptionProps =

  React.ComponentPropsWithoutRef<typeof CardDescription>;

export type CardContentProps =

  React.ComponentPropsWithoutRef<typeof CardContent>;

export type CardFooterProps =

  React.ComponentPropsWithoutRef<typeof CardFooter>;



export {

  Card,

  CardHeader,

  CardFooter,

  CardTitle,

  CardDescription,

  CardContent,

};
