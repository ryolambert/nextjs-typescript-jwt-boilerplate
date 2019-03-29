import App, { Container } from 'next/app';
import * as React from 'react';
import Cookies from 'universal-cookie';
import authService from '../services/auth.service';
import StatusProvider from '../services/status.context';

class MyApp extends App {
	render() {
		const { Component, pageProps } = this.props;

		return (
			<Container>
				<StatusProvider>
					<Component {...pageProps} />
				</StatusProvider>
			</Container>
		);
	}
}

MyApp.getInitialProps = async ({ Component, ctx }) => {
	let pageProps = {};
	if (Component.getInitialProps) {
		pageProps = await Component.getInitialProps(ctx);
	}

	let authToken;
	const cookies = new Cookies(ctx.req ? ctx.req.headers.cookie : null);
	if (ctx.req) {
		// server
		authToken = cookies.get('authToken');
	} else {
		// client
		authToken = cookies.get('authToken');
	}

	const path = ctx.pathname;
	if (!authToken) {
		if (!authService.isAuthPage(path)) {
			return { pageProps };
		} else {
			authService.redirectUser('/home', { res: ctx.res, status: 301 });
		}
	} else {
		// await is required here to stop the rest of the page from executing
		const resp = await authService
			.checkAuthToken(authToken)
			.then(auth => {
				if (path === '/') {
					if (auth.success) {
						authService.redirectUser('/dashboard', { res: ctx.res, status: 301 });
					} else {
						cookies.remove('authToken');
						authService.redirectUser('/home', { res: ctx.res, status: 301 });
					}
				} else if (path === '/home') {
					if (auth.success) {
						authService.redirectUser('/dashboard', { res: ctx.res, status: 301 });
					} else {
						return { ...pageProps, ...{ query: ctx.query, authToken } };
					}
				} else {
					if (auth.success) {
						return { ...pageProps, ...{ query: ctx.query, authToken } };
					} else {
						cookies.remove('authToken');
						authService.redirectUser('/home', { res: ctx.res, status: 301 });
					}
				}
			})
			.catch(() => {});

		return resp ? { pageProps: resp } : { pageProps };
	}
	return { pageProps };
};

export default MyApp;
